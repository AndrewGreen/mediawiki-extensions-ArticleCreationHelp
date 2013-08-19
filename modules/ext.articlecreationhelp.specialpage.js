( function ( $, mw ) {
	$( document ).ready( function () {
		var EXT_ART_C_SPECIALPAGE, loggedIn, tourSpec;

		// Constants
		EXT_ART_C_SPECIALPAGE = {
			// Tour name: coordinate with ArticleCreationHelp.php and
			// .js files
			'anonTourName':	'articlecreationhelpspecialpageanon'
		};

		loggedIn = mw.config.get( [ 'wgArticleCreationHelpRedLinks' ] )
			.wgArticleCreationHelpRedLinks.loggedIn;

		// This script only runs on the special landing page, which should
		// only be accessible to logged-in users (because only they can
		// create articles).

		// TODO set config variables for other Mediawiki configurations
		// (for example, wikis where anonymous users can create articles).

		if (!loggedIn) {

			tourSpec = mw.guidedTour.getTourSpec( EXT_ART_C_SPECIALPAGE.anonTourName );

			mw.guidedTour.launchTour( EXT_ART_C_SPECIALPAGE.anonTourName );
		}

	} );
} ( jQuery, mediaWiki ) );