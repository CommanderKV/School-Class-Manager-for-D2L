// Filter and sort the search dropdown based on the user's input
function filterFunction() {
    // Get the input value and convert it to uppercase
    let input = document.getElementById("search-input").value.toUpperCase().trim();
    
    let filter, filterRaw, filterClass, filterClassRaw = null;
    if (input.indexOf("(") !== -1) {
        filterRaw = input.split("(")[0].trim()
        filter = filterRaw.split(" ");

        filterClassRaw = input.split("(")[1].trim().replace(")", "");
        filterClass = filterClassRaw.split(" ");
    
    } else {
        filterRaw = input;
        filter = filterRaw.split(" ");
    }

    // Get the dropdown container and the cards
    let div = document.querySelector(".card-holder .cards");
    let cards = div.querySelectorAll(".card");


    // Go through the list of items and hide the ones that don't match the search
    for (let i = 0; i < cards.length; i++) {

        // Get the texts as a list of words
        let labelWord = cards[i].querySelector("label").innerText.toUpperCase();
        let labelWords = labelWord.split(" ");

        let visible = false;
        
        if (filter != null) {
            // Check if the item starts with the search value
            for (let j = 0; j < labelWords.length; j++) {
                if (filter.length - 1 >= j) {
                    if (labelWords[j].startsWith(filter[j]) || labelWords[j] == filter[j]) {
                        // Change the display of the item
                        cards[i].style.display = "";
                        visible = true;
                        break;
                    } else {
                        // Hide the item
                        cards[i].style.display = "none";
                    }
                }
            }
            
            // If we did not find the filter try Searching the entire string
            if (!visible) {
                if (labelWord.indexOf(filterRaw) !== -1) {
                    cards[i].style.display = "";
                    visible = true;
                }
            }
        }

        
        if (cards[i].querySelector(".course-name") != null) {
            // Check if we should filter by class name
            let courseName = cards[i].querySelector(".course-name").innerText.toUpperCase();
            let courseNameWords = courseName.split(" ");
            if (filterClass != null && visible) {
                let found = false;
                // Go through each course words and see if it matches the filter
                for (let j = 0; j < courseNameWords.length; j++) {
                    if (filterClass.length - 1 >= j) {
                        // If the word matches the filter, show the card
                        if (courseNameWords[j].startsWith(filterClass[j]) || courseNameWords[j] == filterClass[j]) {
                            cards[i].style.display = "";
                            found = true;
                            break;
                        } else {
                            // Hide the card
                            cards[i].style.display = "none";
                        }
                    }
                }
                
                // If we did not find the filter try Searching the entire string
                if (!found) {
                    if (courseName.indexOf(filterClassRaw) !== -1) {
                        cards[i].style.display = "";
                    }
                }
            }
        }
    }
}

document.getElementById("search-input").addEventListener("keyup", filterFunction);