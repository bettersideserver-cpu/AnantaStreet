window.addEventListener('DOMContentLoaded', () => {
    const paths = document.querySelectorAll('.Cutout path');
    const infoCard = document.getElementById('infoCard');
    const modalTitle = document.getElementById('modalTitle');
    const modalButton = document.getElementById('navigateButton');
    const closeCard = document.getElementById('closeCard');
    const detailsEl = document.getElementById('details');

    let selectedPath = null;
    let currentLink = '';

    function updateDetailsFromName(name) {
        if (!detailsEl) return;
        const match = (name || '').match(/\d+/);
        const floorNum = match ? parseInt(match[0], 10) : null;

        if (floorNum === 19 || floorNum === 20) {
            detailsEl.innerHTML = `
    <div>
      <span><strong>Total Units:</strong></span>
      <span>4</span>
    </div>
    <div>
      <span><strong>Size:</strong></span>
      <span>Penthouse- 3 BHK<br>2 Floor<br>2 Lobby</span>
    </div>
    <div>
      <span><strong>Partition:</strong></span>
      <span>A1 | A2 | A3</span>
    </div>
  `;
        }
        else {
            detailsEl.innerHTML = `
          <div>
            <span><strong>Total Units:</strong></span>
            <span>8</span>
          </div>
          <div>
            <span><strong>Size:</strong></span>
            <span>3 BHK + 1</span>
          </div>
          <div>
      <span><strong>Partition:</strong></span>
      <span>A1 | A2 | A3</span>
    </div>
        `;
        }
    }

    function setExploreState(hasLink) {
        if (!modalButton) return;
        modalButton.disabled = !hasLink;
        modalButton.style.opacity = hasLink ? '1' : '0.6';
        modalButton.style.pointerEvents = hasLink ? 'auto' : 'none';
        modalButton.title = hasLink ? '' : 'No page linked for this floor';
    }

    // Path click -> open card, set title, details, link
    paths.forEach(path => {
        path.addEventListener('click', (e) => {
            e.stopPropagation();

            // Deselect previous
            if (selectedPath && selectedPath !== path) {
                selectedPath.classList.remove('selected');
            }

            // Toggle current
            if (path.classList.contains('selected')) {
                path.classList.remove('selected');
                infoCard.style.display = 'none';
                selectedPath = null;
                currentLink = '';
                modalTitle.textContent = '~';
                setExploreState(false);
            } else {
                path.classList.add('selected');
                selectedPath = path;

                // Title
                const name = path.getAttribute('data-name') || path.id || 'Info';
                modalTitle.textContent = name;

                // Details
                updateDetailsFromName(name);

                // Link (relative, strip leading slash if any)
                const link = path.getAttribute('data-link') || '';
                currentLink = link.replace(/^\//, '');
                setExploreState(!!currentLink);
                // ✅ Add these lines here
                sessionStorage.setItem('lastFloorName', name);
                sessionStorage.setItem('lastFloorLink', currentLink);

                // Show modal
                infoCard.style.display = 'flex';
            }
        });
    });

    // Explore -> navigate
    if (modalButton) {
        modalButton.addEventListener('click', () => {
            if (currentLink) {
                window.location.href = currentLink;
            }
        });
    }

    // Close button -> hide & reset
    if (closeCard) {
        closeCard.addEventListener('click', () => {
            infoCard.style.display = 'none';
            if (selectedPath) {
                selectedPath.classList.remove('selected');
                selectedPath = null;
            }
            currentLink = '';
            modalTitle.textContent = '~';
            setExploreState(false);
        });
    }

    // Click outside -> hide & reset
    document.addEventListener('click', (e) => {
        const isPath = e.target.closest('path');
        const isModal = e.target.closest('.info-content');
        if (!isPath && !isModal) {
            infoCard.style.display = 'none';
            if (selectedPath) {
                selectedPath.classList.remove('selected');
                selectedPath = null;
            }
            currentLink = '';
            modalTitle.textContent = '~';
            setExploreState(false);
        }
    });
});