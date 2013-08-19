// Tour (just an overlay) for anonymous users on landing page
// TODO This is so un-tour-like, should it be implemented another way?
( function ( window, document, $, mw, gt ) {
	gt.defineTour( {
		name: 'articlecreationhelpspecialpageanon',
		steps: [ {
			closeOnEscape: false,
			title: null,
			overlay: true,
			width: 370,
			allowAutomaticOkay: false,
			xButton: false,
			closeOnClickOutside: false
		} ],
		isSinglePage: true
	} );
} (window, document, jQuery, mediaWiki, mediaWiki.guidedTour ) );