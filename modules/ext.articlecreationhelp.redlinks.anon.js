// Tour for red links for anonymous users
( function ( window, document, $, mw, gt ) {
	gt.defineTour( {
		name: 'articlecreationhelpredlinksanon',
		shouldLog: true,
		steps: [ {
			title: null,
			classString: 'ext-art-c-h-guider',
			position: 'top',
			offset: {gap: 23},
			width: 360,
			attachTo: '.ext-art-c-h-redlinkattach',
			onClose: mw.articlecreationhelp.internal.closeTourHandler,
			allowAutomaticOkay: false,
		}, {
			title: null,
			classString: 'ext-art-c-h-guider ext-art-c-h-divided-top-guider',
			vFlippedClassString: 'ext-art-c-h-guider',
			position: 'top',
			offset: {gap: 23},
			width: 360,
			animateFromPrev: true,
			attachTo: '.ext-art-c-h-redlinkattach',
			onClose: mw.articlecreationhelp.internal.closeTourHandler,
			allowAutomaticOkay: false,
		} ],
		isSinglePage: true
	} );
} ( window, document, jQuery, mediaWiki, mediaWiki.guidedTour ) );
