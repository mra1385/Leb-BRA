// Placeholder for any future JavaScript functionality
console.log("Script loaded.");

document.addEventListener('DOMContentLoaded', function() {
    const tocMenuButton = document.getElementById('toc-menu-button');
    const tocMenu = document.getElementById('toc-menu');
    const tocCloseButton = document.getElementById('toc-close-button'); 

    console.log('Adding static listeners (menu open/close)...');
    // --- Setup Static Button Listeners Immediately --- 
    if (tocMenuButton && tocMenu) {
        tocMenuButton.addEventListener('click', () => {
            tocMenu.classList.toggle('toc-menu-visible');
            document.body.classList.toggle('toc-menu-open');
        });
    } else { console.error('Menu button or menu panel not found.'); }
    if (tocCloseButton && tocMenu) {
        tocCloseButton.addEventListener('click', () => {
            tocMenu.classList.remove('toc-menu-visible');
            document.body.classList.remove('toc-menu-open');
        });
    } else { console.error('Close Button element not found.'); }

    // --- Fetch Table Content --- 
    console.log('Fetching table content...');
    fetch('table_content.html')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.statusText);
            }
            return response.text();
        })
        .then(html => {
            console.log('Table content fetched. Inserting into container...');
            const tableContainer = document.getElementById('table-container');
            const aspectLabelSpan = document.getElementById('current-aspect-label');
            const tocList = document.getElementById('toc-list');

            if (tableContainer && aspectLabelSpan && tocList) {
                tableContainer.innerHTML = html;
                console.log('Table content inserted.');

                // *** Now that HTML is inserted, find tbody and setup ***
                const table = tableContainer.querySelector('table');
                const tbody = table?.querySelector('tbody');

                if (tbody) {
                     console.log('>>> Found tbody. Calling setupTableSpecificListeners and populateToc.');
                     setupTableSpecificListeners(tableContainer, tbody, aspectLabelSpan);
                     populateToc(tbody, tocList, tableContainer); 
                } else {
                    console.error('Error: Could not find tbody inside the inserted table content!');
                    tableContainer.innerHTML = '<p>Error processing table structure.</p>';
                }
            } else {
                console.error('Error: One or more required elements (container, aspect label, toc list) not found after fetch.');
            }
        })
        .catch(error => {
            console.error('Error fetching or processing table content:', error);
            const tableContainer = document.getElementById('table-container');
            if (tableContainer) {
                tableContainer.innerHTML = '<p>Error loading table content. Please check console for details.</p>';
            }
        });
});

// Function specifically for listeners that need the table/tbody
function setupTableSpecificListeners(tableContainer, tbody, aspectLabelSpan) {
     console.log('Inside setupTableSpecificListeners.');
     let highlightedRow = null;
     let lastKnownRowIndex = -1;
     let scrollTimeout;

     // --- Click Listener for Highlighting --- 
     tbody.addEventListener('click', function(event) {
        const clickedRow = event.target.closest('tr');
        if (clickedRow) {
            if (highlightedRow) {
                highlightedRow.classList.remove('highlighted-row');
            }
            if (highlightedRow === clickedRow) {
                highlightedRow = null;
            } else {
                clickedRow.classList.add('highlighted-row');
                highlightedRow = clickedRow;
                updateRowContext(clickedRow, aspectLabelSpan);
                lastKnownRowIndex = Array.from(tbody.children).indexOf(clickedRow);
            }
        }
     });

     // --- Scroll Listener for Context Overlay --- 
     tableContainer.addEventListener('scroll', function() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const containerTop = tableContainer.getBoundingClientRect().top;
            const headerHeight = tableContainer.querySelector('thead')?.offsetHeight || 0;
            const effectiveTop = containerTop + headerHeight;
            const rows = tbody.querySelectorAll('tr');
            let topVisibleRowIndex = -1;

            for (let i = 0; i < rows.length; i++) {
                const rowRect = rows[i].getBoundingClientRect();
                const rowMiddle = rowRect.top + rowRect.height / 2;
                if (rowMiddle >= effectiveTop) {
                    topVisibleRowIndex = i;
                    break;
                }
            }
            if (topVisibleRowIndex === -1 && rows.length > 0) {
                 topVisibleRowIndex = rows.length - 1;
            }

            if (topVisibleRowIndex !== -1 && topVisibleRowIndex !== lastKnownRowIndex) {
                updateRowContext(rows[topVisibleRowIndex], aspectLabelSpan);
                lastKnownRowIndex = topVisibleRowIndex;
            }
        }, 50); 
     });
}

// Function to populate the Table of Contents
function populateToc(tbody, tocListElement, scrollContainer) {
    console.log('--- Starting populateToc --- '); 
    const rows = tbody.querySelectorAll('tr'); 
    tocListElement.innerHTML = ''; 
    console.log(`   populateToc: Found ${rows.length} rows in tbody.`); 
    let itemsAdded = 0;

    // Add scrolling adjustment CSS - forces anchors to account for fixed header
    let scrollPaddingStyle = document.getElementById('scroll-padding-style');
    if (!scrollPaddingStyle) {
        scrollPaddingStyle = document.createElement('style');
        scrollPaddingStyle.id = 'scroll-padding-style';
        document.head.appendChild(scrollPaddingStyle);
    }
    
    const tableHeader = scrollContainer.querySelector('thead');
    const headerHeight = tableHeader ? tableHeader.offsetHeight : 0;
    scrollPaddingStyle.textContent = `
        #table-container {
            scroll-padding-top: ${headerHeight}px;
        }
    `;
    console.log(`Applied scroll-padding-top of ${headerHeight}px`);

    rows.forEach((row, index) => {
        const firstCell = row.querySelector('td:first-child');
        if (firstCell && firstCell.textContent.trim()) {
            const categoryText = firstCell.textContent.trim();
            
            // Create a real anchor ID for this row - right at the beginning of the row
            const anchorId = `table-row-${index}`;
            
            // Set the ID directly on the row
            row.id = anchorId;
            
            // Create ToC List Item with a real anchor link
            const listItem = document.createElement('li');
            listItem.innerHTML = `<a href="#${anchorId}" class="toc-link">${categoryText}</a>`;
            tocListElement.appendChild(listItem);
            itemsAdded++;
        }
    });

    // Add a delegated event listener for the TOC list
    tocListElement.addEventListener('click', function(event) {
        // Find the closest anchor if the event target is inside one
        const link = event.target.closest('a.toc-link');
        if (link) {
            // Let the default browser behavior handle the scroll
            // But add our custom behavior after it
            
            // Get the target row ID from the href
            const targetId = link.getAttribute('href').substring(1);
            const targetRow = document.getElementById(targetId);
            
            // Add highlighting
            setTimeout(() => {
                // Update highlighting
                const previouslyHighlighted = scrollContainer.querySelector('tr.highlighted-row');
                if (previouslyHighlighted) {
                    previouslyHighlighted.classList.remove('highlighted-row');
                }
                if (targetRow) {
                    targetRow.classList.add('highlighted-row');
                
                    // Update context label
                    const aspectLabelSpan = document.getElementById('current-aspect-label');
                    if (aspectLabelSpan) {
                        updateRowContext(targetRow, aspectLabelSpan);
                    }
                }
                
                // Close the menu
                const tocMenu = document.getElementById('toc-menu');
                if (tocMenu) {
                    tocMenu.classList.remove('toc-menu-visible');
                    document.body.classList.remove('toc-menu-open');
                }
            }, 100);
        }
    });
    
    console.log(`   populateToc: Added ${itemsAdded} items to the ToC list.`);
    console.log('--- Finished populateToc --- ');
}

// Helper function to update the context overlay text
function updateRowContext(rowElement, aspectLabelSpanElement) {
    if (rowElement && aspectLabelSpanElement) {
        const firstCell = rowElement.querySelector('td:first-child, th:first-child');
        if (firstCell) {
            aspectLabelSpanElement.textContent = firstCell.textContent || firstCell.innerText;
        } else {
             aspectLabelSpanElement.textContent = 'N/A';
        }
    }
} 