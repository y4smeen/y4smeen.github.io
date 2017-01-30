$(document).ready(function() {
    // Add smooth scrolling to all links of the form "#foobar"
    $('a').on('click', function(event) {

        // Make sure this.hash has a value before overriding default behavior
        // Otherwise, this <a> is a real link to another page, and we want to just go there
        if (this.hash !== '') {
            // Prevent default anchor click behavior (which is to change the URL)
            event.preventDefault();

            // Scroll to the hash in 800ms
            $('html, body').animate({
                scrollTop: $(this.hash).offset().top
            }, 800);
        }
    });
});
