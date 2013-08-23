// Tour for red links for anonymous users
( function ( window, document, $, mw, gt ) {
	gt.defineTour( {
		name: 'articlecreationhelpredlinksanon',
		shouldLog: true,
		steps: [ {
			title: null,
			position: 'top',
			offset: {gap: 23},
			width: 350,
			attachTo: '.ext-art-c-h-redlinkattach',
			uncacheable: true,
			allowAutomaticOkay: false,
		},
		{
			title: null,
			position: 'top',
			offset: {gap: 23},
			width: 330,
			attachTo: '.ext-art-c-h-redlinkattach',
			uncacheable: true,
			allowAutomaticOkay: false
		} ],
		isSinglePage: true
	} );
} (window, document, jQuery, mediaWiki, mediaWiki.guidedTour ) );
