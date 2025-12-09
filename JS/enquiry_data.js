const scriptURL = "https://script.google.com/macros/s/AKfycbzK8mD3jIf-PV3SYlCTpShqk4dYqNyvJX9Ki-Hu01KrVTY6Iq1AA7mOCBQ_Tn5mJsbJaw/exec";

(function handleEnquiryForm() {
    const form = document.getElementById("enquiryForm");
    const agree = document.getElementById("agree");
    const submitBtn = form?.querySelector(".submit");
    if (!form) return;

    function setFormBusy(isBusy) {
        if (!submitBtn) return;
        submitBtn.setAttribute("aria-busy", isBusy ? "true" : "false");
        [...form.elements].forEach(el => el.disabled = isBusy);
    }

    // optional: accessible announcements
    function announce(msg) {
        let live = document.getElementById("live-region");
        if (!live) {
            live = document.createElement("div");
            live.id = "live-region";
            live.setAttribute("aria-live", "polite");
            live.setAttribute("aria-atomic", "true");
            live.style.position = "absolute";
            live.style.left = "-9999px";
            document.body.appendChild(live);
        }
        live.textContent = msg;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!agree.checked) {
            // no popups — just a quick native alert or do nothing
            alert("Please agree to the Privacy Policy and Terms & Conditions.");
            return;
        }

        const fd = new FormData(form);
        fd.append("page_title", document.title);
        fd.append("page_url", location.href);
        fd.append("page_path", location.pathname);
        fd.append("referrer", document.referrer || "");
        fd.append("tower", sessionStorage.getItem("lastTower") || "");
        fd.append("floor_name", sessionStorage.getItem("lastFloorName") || "");
        fd.append("floor_link", sessionStorage.getItem("lastFloorLink") || "");

        const params = new URLSearchParams(location.search);
        ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(k => {
            if (params.has(k)) fd.append(k, params.get(k));
        });

        // Start spinner
        setFormBusy(true);
        announce("Submitting…");

        try {
            const res = await fetch(scriptURL, { method: "POST", body: fd });
            if (!res.ok) throw new Error("Network response was not ok");

            // Success: stop spinner, reset, close the enquiry overlay
            form.reset();
            if (agree) agree.checked = false;
            hideEnquiryOverlay();
            announce("Submitted.");
            // (no popup shown)
        } catch (err) {
            console.error(err);
            // If you want zero popups, you can still show a native alert here,
            // or just log. Uncomment next line if you want a message:
            // alert("Something went wrong. Please try again.");
        } finally {
            setFormBusy(false); // stop spinner
        }
    });
    (function () {
        const overlay = document.getElementById('enquiryOverlay');
        const openBtn = document.getElementById('openEnquiry');
        const closeBtn = document.getElementById('closeBtn');

        if (!overlay || !openBtn || !closeBtn) return;

        openBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showEnquiryOverlay();
        });

        closeBtn.addEventListener('click', hideEnquiryOverlay);

        overlay.addEventListener('click', (e) => {
            if (!e.target.closest('.modal')) hideEnquiryOverlay();
        });
    })();
    function showEnquiryOverlay() {
        const overlay = document.getElementById('enquiryOverlay');
        if (!overlay) return;
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function hideEnquiryOverlay() {
        const overlay = document.getElementById('enquiryOverlay');
        if (!overlay) return;
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

})();


