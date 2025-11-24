/**
 * Settings Tab Debug Script
 * Helps identify why settings tabs might not be displaying
 */

console.log('🔍 Settings Debug Script Loaded');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 Checking Settings Tabs...');
    
    // Check if settings section exists
    const settingsSection = document.getElementById('settings-section');
    if (!settingsSection) {
        console.error('❌ Settings section not found!');
        return;
    }
    console.log('✅ Settings section found');
    
    // Check all tab buttons
    const tabButtons = document.querySelectorAll('#settings-section .tab-btn');
    console.log(`✅ Found ${tabButtons.length} tab buttons:`, Array.from(tabButtons).map(btn => btn.textContent));
    
    // Check all tab content divs
    const tabContents = document.querySelectorAll('#settings-section .tab-content');
    console.log(`✅ Found ${tabContents.length} tab content divs`);
    
    tabContents.forEach((tab, index) => {
        const isActive = tab.classList.contains('active');
        const hasContent = tab.innerHTML.trim().length > 0;
        const display = window.getComputedStyle(tab).display;
        
        console.log(`Tab ${index + 1} (${tab.id}):`, {
            active: isActive,
            hasContent: hasContent,
            contentLength: tab.innerHTML.length,
            display: display,
            visible: display !== 'none'
        });
    });
    
    // Test tab switching
    console.log('🧪 Testing tab switching function...');
    if (typeof switchSettingsTab === 'function') {
        console.log('✅ switchSettingsTab function exists');
        
        // Add click listeners to debug
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const onclick = btn.getAttribute('onclick');
                console.log('🖱️ Tab button clicked:', btn.textContent, 'onclick:', onclick);
            });
        });
    } else {
        console.error('❌ switchSettingsTab function not found!');
    }
    
    // Check for CSS issues
    const style = document.createElement('style');
    style.textContent = `
        /* Debug: Make sure tab-content.active is visible */
        #settings-section .tab-content.active {
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
        }
        #settings-section .tab-content {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
    console.log('✅ Debug CSS added');
    
    // Manual tab switcher for testing
    window.debugSwitchTab = function(tabName) {
        console.log('🔄 Debug switching to:', tabName);
        
        // Remove all active classes
        document.querySelectorAll('#settings-section .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('#settings-section .tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Add active to target
        const targetBtn = document.querySelector(`#settings-section .tab-btn[onclick*="${tabName}"]`);
        const targetContent = document.getElementById(tabName + '-tab');
        
        if (targetBtn) {
            targetBtn.classList.add('active');
            console.log('✅ Button activated:', targetBtn.textContent);
        } else {
            console.error('❌ Button not found for:', tabName);
        }
        
        if (targetContent) {
            targetContent.classList.add('active');
            console.log('✅ Content activated:', targetContent.id);
            console.log('Content display:', window.getComputedStyle(targetContent).display);
            console.log('Content has children:', targetContent.children.length);
        } else {
            console.error('❌ Content not found for:', tabName + '-tab');
        }
    };
    
    console.log('✅ Debug complete. Use debugSwitchTab("security") to test manually.');
});
