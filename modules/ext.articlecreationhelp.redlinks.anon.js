// Tour for red links for anonymous users
( function ( window, document, $, mw, gt ) {
	gt.defineTour( {
		name: 'articlecreationhelpredlinksanon',
		shouldLog: true,
		steps: [ {
			title: null,
			position: 'top',
			bufferOffset: 23,
			width: 370,
			attachTo: '.ext-art-c-h-redlinkattach',
			uncacheable: true,
			allowAutomaticOkay: false,
		},
		{
			title: null,
			position: 'top',
			bufferOffset: 23,
			width: 330,
			attachTo: '.ext-art-c-h-redlinkattach',
			uncacheable: true,
			allowAutomaticOkay: false
		} ],
		isSinglePage: true
	} );
} (window, document, jQuery, mediaWiki, mediaWiki.guidedTour ) );
