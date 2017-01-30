$('.about-page a').click(function(e){
	//make all tabs inactive
	$('.project-page a').removeClass('active');
	$('.contact-page a').removeClass('active');
	//then make the clicked tab active
	$(this).addClass('active');
	$('.projects .contact').hide();
	$('.about').show();
});


$('.project-page a').click(function(e){
	//make all tabs inactive
	$('.about-page a').removeClass('active');
	$('.contact-page a').removeClass('active');
	//then make the clicked tab active
	$(this).addClass('active');
	$('.about .contact').hide();
	$('.projects').show();
});

$('.contact-page a').click(function(e){
	//make all tabs inactive
	$('.project-page a').removeClass('active');
	$('.contact-page a').removeClass('active');
	//then make the clicked tab active
	$(this).addClass('active');
	$('.projects .about').hide();
	$('.contact').show();
});
