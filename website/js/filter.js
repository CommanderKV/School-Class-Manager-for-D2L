// Filter the search dropdown based on the user's input
function filterFunction(className) {
    // Get the input value and convert it to uppercase
    let input = document.getElementById("search-input");
    let filter = input.value.toUpperCase();

    // Get the dropdown container and the cards
    let div = document.querySelector(`.card-holder > .cards.${className}`);
    let cards = div.getElementsByClassName("card");

    // Go through the list of items and hide the ones that don't match the search
    for (i = 0; i < cards.length; i++) {
        // Get the text value of the item
        txtValue = cards[i].querySelector("label").innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
            // Change the dispaly the item
            cards[i].style.display = "";
        } else {
            // Hide the item
            cards[i].style.display = "none";
        }
    }
}