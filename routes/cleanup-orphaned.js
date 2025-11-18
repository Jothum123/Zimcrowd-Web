// Cleanup Orphaned Records Route
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Check for orphaned records
router.get('/check', async (req, res) => {
    try {
        // Get all users from public.users
        const { data: publicUsers, error: publicError } = await supabase
            .from('users')
            .select('id, phone, email, full_name');

        if (publicError) {
            console.error('Error fetching public users:', publicError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch users'
            });
        }

        // Get all auth users
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

        if (authError) {
            console.error('Error fetching auth users:', authError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch auth users'
            });
        }

        const authUserIds = new Set(authUsers.users.map(u => u.id));

        // Find orphaned records
        const orphanedUsers = publicUsers.filter(u => !authUserIds.has(u.id));

        res.json({
            success: true,
            totalUsers: publicUsers.length,
            totalAuthUsers: authUsers.users.length,
            orphanedCount: orphanedUsers.length,
            orphanedUsers: orphanedUsers.map(u => ({
                id: u.id,
                phone: u.phone,
                email: u.email,
                full_name: u.full_name
            }))
        });

    } catch (error) {
        console.error('Check orphaned error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check orphaned records'
        });
    }
});

// Check specific phone number
router.post('/check-phone', async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }

        // Check in users table
        const { data: userRecord, error: userError } = await supabase
            .from('users')
            .select('id, phone, email, full_name')
            .eq('phone', phone)
            .maybeSingle();

        if (userError) {
            console.error('Error checking user:', userError);
        }

        // Check in profiles table
        const { data: profileRecord, error: profileError } = await supabase
            .from('profiles')
            .select('id, phone, email, first_name, last_name')
            .eq('phone', phone)
            .maybeSingle();

        if (profileError) {
            console.error('Error checking profile:', profileError);
        }

        // Check in auth
        let authExists = false;
        if (userRecord) {
            const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userRecord.id);
            authExists = !authError && authUser;
        }

        res.json({
            success: true,
            phone,
            userRecord: userRecord || null,
            profileRecord: profileRecord || null,
            authExists,
            isOrphaned: (userRecord || profileRecord) && !authExists
        });

    } catch (error) {
        console.error('Check phone error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check phone number'
        });
    }
});

// Delete orphaned records
router.post('/cleanup', async (req, res) => {
    try {
        const { phone, email, confirmDelete } = req.body;

        if (!confirmDelete) {
            return res.status(400).json({
                success: false,
                message: 'Please confirm deletion by setting confirmDelete: true'
            });
        }

        let deletedCount = 0;
        const deletedFrom = [];

        if (phone || email) {
            // Delete specific phone number or email
            
            // Find user IDs to delete from auth
            let userIdsToDelete = [];

            if (phone) {
                // Find by phone in users table
                const { data: phoneUsers } = await supabase
                    .from('users')
                    .select('id')
                    .eq('phone', phone);
                
                if (phoneUsers) {
                    userIdsToDelete.push(...phoneUsers.map(u => u.id));
                }

                // Find by phone in profiles table
                const { data: phoneProfiles } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('phone', phone);
                
                if (phoneProfiles) {
                    userIdsToDelete.push(...phoneProfiles.map(u => u.id));
                }

                // Find by phone in auth.users
                const { data: authUsers } = await supabase.auth.admin.listUsers();
                const phoneAuthUsers = authUsers.users.filter(u => 
                    u.phone === phone || u.user_metadata?.phone === phone
                );
                userIdsToDelete.push(...phoneAuthUsers.map(u => u.id));
            }

            if (email) {
                // Find by email
                const { data: emailUsers } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', email);
                
                if (emailUsers) {
                    userIdsToDelete.push(...emailUsers.map(u => u.id));
                }
            }

            // Remove duplicates
            userIdsToDelete = [...new Set(userIdsToDelete)];

            // Delete from auth.users first
            for (const userId of userIdsToDelete) {
                try {
                    await supabase.auth.admin.deleteUser(userId);
                    deletedFrom.push('auth.users');
                } catch (error) {
                    console.log(`Could not delete user ${userId} from auth:`, error.message);
                }
            }

            // Delete from users table
            if (phone) {
                const { error: userDeleteError } = await supabase
                    .from('users')
                    .delete()
                    .eq('phone', phone);

                if (!userDeleteError) {
                    deletedCount++;
                    deletedFrom.push('users');
                }
            }

            if (email) {
                const { error: userDeleteError } = await supabase
                    .from('users')
                    .delete()
                    .eq('email', email);

                if (!userDeleteError) {
                    deletedCount++;
                    deletedFrom.push('users');
                }
            }

            // Delete from profiles table
            if (phone) {
                const { error: profileDeleteError } = await supabase
                    .from('profiles')
                    .delete()
                    .eq('phone', phone);

                if (!profileDeleteError) {
                    deletedCount++;
                    deletedFrom.push('profiles');
                }
            }

            if (email) {
                const { error: profileDeleteError } = await supabase
                    .from('profiles')
                    .delete()
                    .eq('email', email);

                if (!profileDeleteError) {
                    deletedCount++;
                    deletedFrom.push('profiles');
                }
            }

            res.json({
                success: true,
                message: `Deleted ${phone || email} from ${[...new Set(deletedFrom)].join(', ')}`,
                deletedCount,
                deletedFrom: [...new Set(deletedFrom)],
                userIdsDeleted: userIdsToDelete.length
            });

        } else {
            // Delete all orphaned records
            
            // Get orphaned user IDs
            const { data: publicUsers } = await supabase
                .from('users')
                .select('id');

            const { data: authUsers } = await supabase.auth.admin.listUsers();
            const authUserIds = new Set(authUsers.users.map(u => u.id));

            const orphanedIds = publicUsers
                .filter(u => !authUserIds.has(u.id))
                .map(u => u.id);

            if (orphanedIds.length > 0) {
                // Delete orphaned users
                const { error: userDeleteError } = await supabase
                    .from('users')
                    .delete()
                    .in('id', orphanedIds);

                if (!userDeleteError) {
                    deletedCount += orphanedIds.length;
                    deletedFrom.push('users');
                }

                // Delete orphaned profiles
                const { error: profileDeleteError } = await supabase
                    .from('profiles')
                    .delete()
                    .in('id', orphanedIds);

                if (!profileDeleteError) {
                    deletedFrom.push('profiles');
                }
            }

            res.json({
                success: true,
                message: `Deleted ${deletedCount} orphaned records`,
                deletedCount,
                deletedFrom
            });
        }

    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup orphaned records'
        });
    }
});

module.exports = router;
