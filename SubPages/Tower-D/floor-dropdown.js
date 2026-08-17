/* =========================================
   PREMIUM FLOOR DROPDOWN
========================================= */

document.addEventListener("DOMContentLoaded", function () {

    /* -----------------------------------------
       FLOOR PAGES
    ----------------------------------------- */

    const floors = [
        {
            name: "Ground Floor",
            page: "Ground.html"
        },
        {
            name: "Floor 1",
            page: "1.html"
        },
        {
            name: "Floor 2",
            page: "2.html"
        },
        {
            name: "Floor 3",
            page: "3.html"
        },
        {
            name: "Floor 4",
            page: "4.html"
        }
    ];


    /* -----------------------------------------
       CURRENT PAGE
    ----------------------------------------- */

    const currentPage =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();


    let currentFloor = floors.find(function (floor) {
        return floor.page.toLowerCase() === currentPage;
    });


    if (!currentFloor) {
        currentFloor = floors[0];
    }


    /* -----------------------------------------
       CREATE CONTAINER
    ----------------------------------------- */

    const container = document.createElement("div");

    container.className = "floor-selector";


    /* -----------------------------------------
       CREATE BUTTON
    ----------------------------------------- */

    const button = document.createElement("button");

    button.type = "button";

    button.className = "floor-dropdown-button";

    button.setAttribute(
        "aria-label",
        "Select Floor"
    );

    button.setAttribute(
        "aria-expanded",
        "false"
    );


    /* -----------------------------------------
       BUTTON TEXT
    ----------------------------------------- */

    const buttonText = document.createElement("span");

    buttonText.className = "floor-dropdown-text";

    buttonText.textContent = currentFloor.name;


    /* -----------------------------------------
       ARROW
    ----------------------------------------- */

    const arrow = document.createElement("span");

    arrow.className = "floor-dropdown-arrow";


    button.appendChild(buttonText);
    button.appendChild(arrow);


    /* -----------------------------------------
       CREATE MENU
    ----------------------------------------- */

    const menu = document.createElement("div");

    menu.className = "floor-dropdown-menu";

    menu.setAttribute(
        "role",
        "menu"
    );


    /* -----------------------------------------
       CREATE FLOOR ITEMS
    ----------------------------------------- */

    floors.forEach(function (floor) {

        const item = document.createElement("button");

        item.type = "button";

        item.className = "floor-dropdown-item";

        item.textContent = floor.name;

        item.setAttribute(
            "role",
            "menuitem"
        );


        /* Current floor */

        if (
            floor.page.toLowerCase() === currentPage
        ) {
            item.classList.add("active");
        }


        /* Click floor */

        item.addEventListener("click", function (event) {

            event.stopPropagation();

            window.location.href = floor.page;

        });


        menu.appendChild(item);

    });


    /* -----------------------------------------
       ADD TO PAGE
    ----------------------------------------- */

    container.appendChild(button);

    container.appendChild(menu);

    document.body.appendChild(container);


    /* -----------------------------------------
       OPEN / CLOSE
    ----------------------------------------- */

    button.addEventListener("click", function (event) {

        event.stopPropagation();

        const isOpen =
            container.classList.toggle("open");

        button.setAttribute(
            "aria-expanded",
            isOpen ? "true" : "false"
        );

    });


    /* -----------------------------------------
       CLICK OUTSIDE
    ----------------------------------------- */

    document.addEventListener("click", function (event) {

        if (!container.contains(event.target)) {

            container.classList.remove("open");

            button.setAttribute(
                "aria-expanded",
                "false"
            );

        }

    });


    /* -----------------------------------------
       ESCAPE KEY
    ----------------------------------------- */

    document.addEventListener("keydown", function (event) {

        if (event.key === "Escape") {

            container.classList.remove("open");

            button.setAttribute(
                "aria-expanded",
                "false"
            );

            button.blur();

        }

    });

});