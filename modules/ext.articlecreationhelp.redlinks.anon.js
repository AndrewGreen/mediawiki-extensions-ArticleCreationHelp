// Tour for red links for anonymous users
( function ( window, document, $, mw, gt ) {
	gt.defineTour( {
		name: 'articlecreationhelpredlinksanon',
		shouldLog: true,
		steps: [ {
			title: null,
			position: 'top',
			offset: {gap: 23},
			width: 340,
			attachTo: '.ext-art-c-h-redlinkattach',
			onClose: mw.articlecreationhelp.internal.closeTourHandler,
			allowAutomaticOkay: false,
		}, {
			title: null,
			position: 'top',
			offset: {gap: 23},
			width: 310,
			animateFromPrev: true,
			attachTo: '.ext-art-c-h-redlinkattach',
			onClose: mw.articlecreationhelp.internal.closeTourHandler,
			allowAutomaticOkay: false,
		} ],
		isSinglePage: true
	} );
} ( window, document, jQuery, mediaWiki, mediaWiki.guidedTour ) );
