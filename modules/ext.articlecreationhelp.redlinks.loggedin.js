// Tour for red links for logged in users
( function ( window, document, $, mw, gt ) {
	gt.defineTour( {
		name: 'articlecreationhelpredlinksloggedin',
		shouldLog: true,
		steps: [ {
			title: null,
			classString: 'ext-art-c-h-guider',
			position: 'top',
			offset: {gap: 23},
			width: 340,
			attachTo: '.ext-art-c-h-redlinkattach',
			onClose: mw.articlecreationhelp.internal.closeTourHandler,
			allowAutomaticOkay: false,
		} ],
		isSinglePage: true
	} );
} (window, document, jQuery, mediaWiki, mediaWiki.guidedTour ) );
