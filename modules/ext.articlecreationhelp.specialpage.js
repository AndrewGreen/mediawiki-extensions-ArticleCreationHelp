( function ( $, mw ) {
	$( document ).ready( function () {
		var loggedIn;

		loggedIn = mw.config.get( [ 'wgArticleCreationHelpRedLinks' ] )
			.wgArticleCreationHelpRedLinks.loggedIn;

		// This script only runs on the special landing page, which should
		// only be accessible to logged-in users (because only they can
		// create articles).

		// TODO set config variables for other Mediawiki configurations
		// (for example, wikis where anonymous users can create articles).


	} );
} ( jQuery, mediaWiki ) );