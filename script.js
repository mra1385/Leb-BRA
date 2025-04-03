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
        const link = event.target.closest('a.toc-link');
        if (link) {
            const targetId = link.getAttribute('href').substring(1);
            const targetRow = document.getElementById(targetId);
            const scrollContainer = document.getElementById('table-container'); // Needed for highlighting

            // Check if mobile styles are active
            const isMobile = window.matchMedia('(max-width: 768px)').matches;
            console.log(`isMobile: ${isMobile}`); // Log if mobile media query matches

            if (isMobile && targetRow && scrollContainer) {
                // --- Mobile: Manual JavaScript Scrolling --- 
                console.log("Mobile condition met. Target:", targetRow, "Container:", scrollContainer);
                event.preventDefault(); // Stop native anchor jump
                
                // First, highlight the row so we can see it's selected correctly
                const previouslyHighlighted = scrollContainer.querySelector('tr.highlighted-row');
                if (previouslyHighlighted) {
                    previouslyHighlighted.classList.remove('highlighted-row');
                }
                targetRow.classList.add('highlighted-row');
                
                // Update context label
                const aspectLabelSpan = document.getElementById('current-aspect-label');
                if (aspectLabelSpan) {
                    updateRowContext(targetRow, aspectLabelSpan);
                }
                
                // CRITICAL FIX: Close the menu FIRST, then wait for layout to stabilize before scrolling
                const tocMenu = document.getElementById('toc-menu');
                if (tocMenu) {
                    tocMenu.classList.remove('toc-menu-visible');
                    document.body.classList.remove('toc-menu-open');
                    
                    // Wait for layout to stabilize after menu closes
                    setTimeout(() => {
                        // Get the table and header elements AFTER layout has stabilized
                        const table = scrollContainer.querySelector('table');
                        const thead = table ? table.querySelector('thead') : null;
                        const headerHeight = thead ? thead.offsetHeight : 0;
                        
                        // Get the target row's position relative to table
                        const rowOffsetTop = targetRow.offsetTop;
                        
                        console.log(`After menu closed - Row offsetTop: ${rowOffsetTop}, Header height: ${headerHeight}`);
                        
                        // Apply scroll position with header adjustment
                        scrollContainer.scrollTop = rowOffsetTop - headerHeight;
                        console.log(`Applied final scrollTop: ${scrollContainer.scrollTop}`);
                    }, 150); // Allow time for CSS transitions to complete
                } else {
                    console.error("Could not find TOC menu element");
                }
            } else if (!isMobile && targetRow && scrollContainer) {
                // --- Desktop: Use Native Scrolling + JS Highlighting --- 
                // Let the default browser anchor scroll happen (no preventDefault)
                
                // Add highlighting slightly after browser scroll starts
                setTimeout(() => {
                    // Update highlighting
                    const previouslyHighlighted = scrollContainer.querySelector('tr.highlighted-row');
                    if (previouslyHighlighted) {
                        previouslyHighlighted.classList.remove('highlighted-row');
                    }
                    targetRow.classList.add('highlighted-row');
                
                    // Update context label
                    const aspectLabelSpan = document.getElementById('current-aspect-label');
                    if (aspectLabelSpan) {
                        updateRowContext(targetRow, aspectLabelSpan);
                    }
                    
                    // Close the menu
                    const tocMenu = document.getElementById('toc-menu');
                    if (tocMenu) {
                        tocMenu.classList.remove('toc-menu-visible');
                        document.body.classList.remove('toc-menu-open');
                    }
                }, 50); // Small delay for highlighting
            } else {
                // Handle cases where targetRow or scrollContainer isn't found
                if (!targetRow) console.error(`Target row #${targetId} not found.`);
                if (!scrollContainer) console.error(`Scroll container not found.`);
            }
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