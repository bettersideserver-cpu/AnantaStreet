(function () {
    const overlay = document.querySelector('.sco-overlay');
    const tip = document.getElementById('scoTip');

    if (!overlay || !tip) return;

    const shapes = overlay.querySelectorAll('[data-link]');

    function showTip(shape, x, y) {
        const name = shape.dataset.name || shape.id.replace(/_/g, ' ');

        const width = shape.dataset.width;
        const length = shape.dataset.length;
        const carpet = shape.dataset.carpet;
        const superArea = shape.dataset.super;

        // Build the tooltip from the values attached to THIS SVG.
        // Format: Label (bold): value (normal)
        let html = `<div class="tip-title">${name}</div>`;

        if (length) {
            html += `<div class="tip-row">
                                    <span class="tip-label">Length:</span>
                                    <span class="tip-value"> ${length}</span>
                                 </div>`;
        }

        if (width) {
            html += `<div class="tip-row">
                                    <span class="tip-label">Width:</span>
                                    <span class="tip-value"> ${width}</span>
                                 </div>`;
        }

        if (carpet) {
            html += `<div class="tip-row">
                                    <span class="tip-label">Carpet Area:</span>
                                    <span class="tip-value"> ${carpet}</span>
                                 </div>`;
        }

        if (superArea) {
            html += `<div class="tip-row">
                                    <span class="tip-label">Super Area:</span>
                                    <span class="tip-value"> ${superArea}</span>
                                 </div>`;
        }

        tip.innerHTML = html;
        tip.style.left = x + 'px';
        tip.style.top = y + 'px';
        tip.classList.add('is-visible');
    }

    function hideTip() {
        tip.classList.remove('is-visible');
    }

    shapes.forEach(shape => {
        const link = shape.dataset.link;

        shape.addEventListener('mouseenter', e => {
            showTip(shape, e.clientX, e.clientY);
        });

        shape.addEventListener('mousemove', e => {
            tip.style.left = e.clientX + 'px';
            tip.style.top = e.clientY + 'px';
        });

        shape.addEventListener('mouseleave', hideTip);

        shape.addEventListener('click', () => {
            if (link) window.location.href = link;
        });

        let armed = false;

        shape.addEventListener('touchstart', e => {
            if (!armed) {
                e.preventDefault();

                shapes.forEach(s => s.classList.remove('is-active'));
                shape.classList.add('is-active');

                const touch = e.touches[0];
                showTip(shape, touch.clientX, touch.clientY);

                armed = true;

                setTimeout(() => {
                    armed = false;
                    shape.classList.remove('is-active');
                    hideTip();
                }, 2500);
            } else {
                if (link) window.location.href = link;
            }
        }, { passive: false });
    });
})();