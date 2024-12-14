// Get the container
let dropdown = document.querySelector(".option-links-container");

// Get the list of items
let optionContainer = dropdown.querySelector(".option-links")
let items = optionContainer.children;

// Update the values based off the screen width
function windowSizeCheck() {
    if (window.innerWidth < 700) {
        items[0].classList.remove("hidden-option");
        for (let i=1; i<items.length; i++) {
            if (!items[i].classList.contains("hidden-option")) {
                items[i].classList.add("hidden-option");
            }
        }
    } else {
        items[0].classList.add("hidden-option");
        for (let i=1; i<items.length; i++) {
            if (items[i].classList.contains("hidden-option")) {
                items[i].classList.remove("hidden-option");
            }
        }
    }
}

// Toggle the drop down menu
function toggleDropDown() {
    if (optionContainer.classList.contains("open")) {
        optionContainer.classList.remove("open");

        // Delay to wait for it to close
        setTimeout(() => {
            for (let i=1; i<items.length; i++) {
                items[i].classList.toggle("hidden-option");
            }
        }, 990);
    } else {
        for (let i=1; i<items.length; i++) {
            items[i].classList.toggle("hidden-option");
        }
        optionContainer.classList.add("open");
    }
}

// Update on page load
windowSizeCheck();

// Add event listener to the dropdown menu button
document.getElementById("menuDropDown").addEventListener("click", toggleDropDown);