( function ( $, mw ) {
	$( document ).ready( function () {
		var EXT_ARTICLE_CREATION_HELP, loggedIn, $focusedRedLink, redLinkHoverTimer,
		lastRedLinkOriginalTitle, $redLinks, tourActive;

		// Constants
		EXT_ARTICLE_CREATION_HELP = {
			// Tour names: coordinate with ArticleCreationHelp.php and
			// .js files for tours.
			'anonTourName':	'articlecreationhelpredlinksanon',
			'loggedInTourName':	'articlecreationhelpredlinksloggedin',
			'hoverTimerMS': 700,

			// CSS classes. Must coordinate with articlecreationhelpredlinks.css
			// redLinkAttach must also coordinate with tour.
			'redLinkAttach': 'ext-art-c-h-redlinkattach',
			'titleInCalloutClass': 'ext-art-c-h-title-in-callout',
			'firstLineInCallout': 'ext-art-c-h-1st-line-in-callout',
			'secondLineInCallout': 'ext-art-c-h-2nd-line-in-callout',
			'paragraphInCalloutClass': 'ext-art-c-h-par-in-callout',
			'buttonClass': 'mw-ui-button',
			'inlineButtonClass': 'mw-ui-primary ext-art-c-h-inline-button'
		};

		// Very strong magic used to get info on whether we're logged in
		loggedIn = mw.config.get( [ 'wgArticleCreationHelpRedLinks' ] )
			.wgArticleCreationHelpRedLinks.loggedIn;

		tourActive = false;
		$focusedRedLink = null;

		// Main function to show tour
		function startTour( $a ) {
			var tourSpec, articleTitle, redTextMeans, noArticle;

			// Don't launch a tour if one's already going for the same link
			if ( ( tourActive ) && ( $a[0] === $focusedRedLink[0] ) ) {
				return;
			}

			tourActive = true;

			// TODO check if we're editing a page, and don't show callouts on
			// red links to the same page. (That can happen when editing a user
			// page or a user talk page.)

			// Set up special class indicating the element to attach to
			if ( $focusedRedLink ) {
				$focusedRedLink.removeClass( EXT_ARTICLE_CREATION_HELP.redLinkAttach );
			}
			$focusedRedLink = $a;
			$focusedRedLink.addClass( EXT_ARTICLE_CREATION_HELP.redLinkAttach );

			articleTitle = getArticleTitle();

			if (loggedIn) {

				// Red links our for logged in users

				tourSpec = mw.guidedTour.getTourSpec( EXT_ARTICLE_CREATION_HELP.loggedInTourName);

				noArticle = makeFirstLine(
					mw.message( 'articlecreationhelp-redlinks-noarticlepre' ).text(),
					articleTitle,
					mw.message( 'articlecreationhelp-redlinks-noarticlepost' ).text() );

				createArticleURL =
					mw.config.get( 'wgScript' )
					+ '?title=Special:ArticleCreationHelp&newtitle='
					+ articleTitle
					+ '&returnto='
					+ mw.config.get( 'wgPageName' );

				tourSpec.steps[0].description = [
					noArticle,
	                makeCreateOne(
		                	mw.message( 'articlecreationhelp-redlinks-createarticle' ).text(),
		                	{ url: createArticleURL } )

	             ].join('');

				tourSpec.steps[0].onClose = onTourClose;

				// Launch the tour
				mw.guidedTour.launchTour( EXT_ARTICLE_CREATION_HELP.loggedInTourName );

			} else {

				// Red links tour for anonymous users

				// Set the descriptions in callouts (set programmatically because
				// they contain the article name).
				tourSpec = mw.guidedTour.getTourSpec( EXT_ARTICLE_CREATION_HELP.anonTourName );

				redTextMeans = makeFirstLine(
					mw.message( 'articlecreationhelp-redlinks-redtextmeanspre' ).text(),
					articleTitle,
					mw.message( 'articlecreationhelp-redlinks-redtextmeanspost' ).text() );

				tourSpec.steps[0].description = [
	                redTextMeans,
	                makeCreateOne(
	                	mw.message( 'articlecreationhelp-redlinks-learnmore' ).text(),
	                	{ callbackString: 'mw.libs.guiders.next();' } )

	             ].join('');

				tourSpec.steps[0].onClose = onTourClose;

				tourSpec.steps[1].description = makeSignUpOrLogIn();
				tourSpec.steps[1].onClose = onTourClose;

				// Launch the tour
				mw.guidedTour.launchTour( EXT_ARTICLE_CREATION_HELP.anonTourName );
			}
		}

		function onTourClose() {
			tourActive = false;
		}

		// Extract title of article pointed to
		// TODO Find a better way to do this, maybe with parser hooks?
		function getArticleTitle() {
			var match = $focusedRedLink.attr( 'href' ).match( /title=([^&]*)/ );
			if (match && match.length > 1) {
				return match[1].replace( /_/g, " " );
			} else {
				return $focusedRedLink.text();
			}
		}

		// Generate HTML for the "no article about" paragraph.
		function makeFirstLine( pre, title, post ) {
			return [
	            '<p class="',
	            EXT_ARTICLE_CREATION_HELP.paragraphInCalloutClass,
	            ' ',
	            EXT_ARTICLE_CREATION_HELP.firstLineInCallout,
	            '">',
				pre,
				'<span class="',
				EXT_ARTICLE_CREATION_HELP.titleInCalloutClass,
				'">',
				title,
				'</span>',
				post,
				'</p>'
			].join('');
		}

		// Home-baked buttons for savory positioning goodness
		function makeInlineButton( name, options ) {
			var html, url;

			url = options.url || 'javascript:void(0)';

			html = [
				'<a href="',
				url,
				'" class="',
				EXT_ARTICLE_CREATION_HELP.buttonClass,
				' ',
				EXT_ARTICLE_CREATION_HELP.inlineButtonClass,
				'"'
			].join('');

			if (options.callbackString) {
				html = [
					html,
					' onclick="',
					options.callbackString,
					'"'
				].join('');
			}

			return [
				html,
				'>',
				name,
				'</a>'
	        ].join('');
		}

		// Generate HTML for the "would you like to create one?" paragraph
		function makeCreateOne(buttonName, buttonOptions) {
			return [
	            '<p class="',
	            EXT_ARTICLE_CREATION_HELP.paragraphInCalloutClass,
	            '"><span class="',
				EXT_ARTICLE_CREATION_HELP.secondLineInCallout,
	            '">',
	            mw.message( 'articlecreationhelp-redlinks-liketocreateone' ).text(),
	            '</span>&nbsp;',
	            makeInlineButton(
            		buttonName,
            		buttonOptions
        		),
				'</p>'
			].join('');
		}

		// Generate HTML for the "please sign up or log in" paragraph
		function makeSignUpOrLogIn() {
			var createAccountURL, signInURL;

			createAccountURL = mw.config.get( 'wgScript' ) + '?title=Special:UserLogin&type=signup';
			signInURL = mw.util.wikiGetlink( 'Special:UserLogin' );

			return [
				'<p class="',
				EXT_ARTICLE_CREATION_HELP.paragraphInCalloutClass,
				'"><span class="',
				EXT_ARTICLE_CREATION_HELP.secondLineInCallout,
				'">',
				mw.message( 'articlecreationhelp-redlinks-firststep-pre' ).text(),
				'</span>',
				makeInlineButton(
					mw.message( 'articlecreationhelp-redlinks-firststep-signup' ).text(),
					{ url: createAccountURL }
				),
				'<span class="',
				EXT_ARTICLE_CREATION_HELP.secondLineInCallout,
				'">',
				mw.message( 'articlecreationhelp-redlinks-firststep-or' ).text(),
				'</span>',
				makeInlineButton(
					mw.message( 'articlecreationhelp-redlinks-firststep-login' ).text(),
					{ url: signInURL }
				),
				'<span class="',
				EXT_ARTICLE_CREATION_HELP.secondLineInCallout,
				'">',
				mw.message( 'articlecreationhelp-redlinks-firststep-post' ).text(),
				'</span></p>',
	        ].join('');
		}

		// Set up click and hover handlers for all red links on the page
		redLinkHoverTimer = null;
		lastRedLinkOriginalTitle = null;

		function clearRedLinkHoverTimer() {
			if ( redLinkHoverTimer != null ) {
				clearTimeout( redLinkHoverTimer );
				redLinkHoverTimer = null;
			}
		}

		// Get the anchor target for events
		function getAnchorFromEvent( event ) {
			return $( event.target ).closest( 'a' );
		}

		// TODO Find a sounder way to select red links (like adding a special
		// class to them on the server via a parser hook?)
		$redLinks = $('a.new');

		// Click handler
		$redLinks.click( function ( event ) {
			clearRedLinkHoverTimer();
			startTour( getAnchorFromEvent( event ) );
			return false;
		} );

		// Hover (mousover and mouseout) handlers
		// TODO If a tour is activated on hover, then moving the mouse off the
		// link and away from the callout should start a timer for
		// ending the tour.
		$redLinks.hover( function( event ) {

			var $a =  getAnchorFromEvent(event);

			if ( redLinkHoverTimer === null ) {
				redLinkHoverTimer = setTimeout(function() {
					clearRedLinkHoverTimer();
					startTour( $a );
				}, EXT_ARTICLE_CREATION_HELP.hoverTimerMS );
			}

			// Prevent native tooltip on link by removing title attribute
			// TODO check cross-browser effectiveness, soundness for accessibility
			lastRedLinkOriginalTitle = $a.attr( 'title' );
			$a.removeAttr( 'title' );

		}, function ( event ) {
			clearRedLinkHoverTimer();

			// Re-attach original title attribute
			getAnchorFromEvent( event ).attr( 'title', lastRedLinkOriginalTitle );
		} );
	} );

} ( jQuery, mediaWiki ) );