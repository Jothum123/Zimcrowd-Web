// Emergency debug script - paste this into browser console
console.log('🔍 Starting emergency tab debug...');

// Check if tabs exist
const settingsSection = document.getElementById('settings-section');
console.log('Settings section exists:', !!settingsSection);

if (settingsSection) {
    const allTabs = settingsSection.querySelectorAll('.tab-content');
    console.log('Found tabs:', allTabs.length);
    
    allTabs.forEach((tab, index) => {
        const styles = window.getComputedStyle(tab);
        console.log(`\nTab ${index + 1} (${tab.id}):`);
        console.log('  - display:', styles.display);
        console.log('  - visibility:', styles.visibility);
        console.log('  - opacity:', styles.opacity);
        console.log('  - height:', styles.height);
        console.log('  - overflow:', styles.overflow);
        console.log('  - position:', styles.position);
        console.log('  - innerHTML length:', tab.innerHTML.length);
        console.log('  - children count:', tab.children.length);
        console.log('  - classList:', Array.from(tab.classList));
        
        if (tab.children.length > 0) {
            const firstChild = tab.children[0];
            const childStyles = window.getComputedStyle(firstChild);
            console.log('  - First child class:', firstChild.className);
            console.log('  - First child display:', childStyles.display);
            console.log('  - First child visibility:', childStyles.visibility);
        }
    });
    
    // Try to force show security tab
    console.log('\n🔧 Forcing security tab to show...');
    const securityTab = document.getElementById('security-tab');
    if (securityTab) {
        // Remove all inline styles first
        securityTab.removeAttribute('style');
        
        // Force show with !important
        securityTab.style.cssText = `
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            height: auto !important;
            overflow: visible !important;
            position: relative !important;
            min-height: 500px !important;
        `;
        
        securityTab.classList.add('active');
        
        // Force show all children
        Array.from(securityTab.children).forEach(child => {
            child.style.cssText = `
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            `;
        });
        
        console.log('✅ Security tab forced to show');
        console.log('Security tab computed display:', window.getComputedStyle(securityTab).display);
        console.log('Security tab computed height:', window.getComputedStyle(securityTab).height);
    }
}
