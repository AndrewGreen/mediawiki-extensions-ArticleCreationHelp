// Tour for red links for anonymous users
( function ( window, document, $, mw, gt ) {
	gt.defineTour( {
		name: 'articlecreationhelpredlinksanon',
		shouldLog: false,
		steps: [ {
			title: null,
			classString: 'ext-art-c-h-guider',
			position: 'top',
			offset: {gap: 23},
			width: 360,
			attachTo: '.ext-art-c-h-redlinkattach',
			onClose: mw.articlecreationhelp.internal.closeTourHandler,

			// callbacks to prevent auto-hiding guider if the mouse is over it
			onMouseEnter: mw.articlecreationhelp.internal.guiderMouseEnter,
			onMouseLeave: mw.articlecreationhelp.internal.guiderMouseLeave,

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
