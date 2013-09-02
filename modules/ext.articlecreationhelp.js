/**
 *  Main Javascript for ArticleCreationHelp.
 *
 *  Here's how separation of concerns works here. There are four singletons and
 *  one class that know nothing about each other:
 *
 *    state             Holds info about current state
 *    uiInteractionMgr  Binds handlers for red links, manages low-level interaction
 *    htmlFactory       Produces HTML strings for inclusion in guiders
 * 	  logger            Logs stuff TODO
 *    RedLink           A high-level wrapper for red links
 *
 *  Finally, there's a presenter that uses all of the above and contains the
 *  global logic.
 *
 */
( function ( $, mw ) {
	$( document ).ready( function () {
		var state, uiInteractionMgr, htmlFactory, logger;

		/**
		 * Higher-level wrapper for red links.
		 *
		 * @param {jQuery} jQuery object representing a red link DOM element
		 *
		 */
		function RedLink ( $elem ) {
			var match;
			this.$elem = $elem;

			// CSS class detected by guiders for attachment. Must coordinate
			// with attachTo in tours.
			this.RED_LINK_ATTACH_CLASS = 'ext-art-c-h-redlinkattach';

			// Extract article title
			// TODO Find a better way to do this, maybe with parser hooks?
			// Still, it seems to work.
			match = this.$elem.attr( 'href' ).match( /title=([^&]*)/ );
			if (match && match.length > 1) {
				this.articleTitle =  match[1].replace( /_/g, " " );
			} else {
				// fallback
				this.articleTitle = $elem.text();
			}
		};

		/**
		 * Check if this red link is the same as the jQuery object passed
		 *
		 * @param $otherElem {jQuery} jQuery object
		 *
		 * @returns true if $otherElem represents the same red link as this object, false if not
		 */
		RedLink.prototype.same = function ( $otherElem ) {
			return this.$elem[ 0 ] === $otherElem[ 0 ];
		};

		/**
		 * Mark a red link for attachment by a guider.
		 *
		 * @param mark {boolean} To mark or not to mark
		 */
		RedLink.prototype.markForGuider = function ( mark ) {
			if ( mark ) {
				this.$elem.addClass( this.RED_LINK_ATTACH_CLASS );
			} else {
				this.$elem.removeClass( this.RED_LINK_ATTACH_CLASS );
			}
		};

		/**
		 * Manages information on current state.
		 *
		 * @singleton
		 */
		state = function () {
			var config, loggedIn, onSpecialPage;

			// TODO Simplify getting stuff from config?
			config = mw.config.get( [ 'wgArticleCreationHelpRedLinks' ] );
			loggedIn = config.wgArticleCreationHelpRedLinks.loggedIn;
			onSpecialPage = config.wgArticleCreationHelpRedLinks.onSpecialPage;

			// Public (internal) API
			return {
				loggedIn: loggedIn,
				onSpecialPage: onSpecialPage,
				tourActive: false,
				focusedRedLink: null
			};
		}();

		/**
		 * Sets up and manages low-level events on red links,
		 * calling showCallback($elem) when a guider should be shown over
		 * the red link represented by $elem (a jQuery object representing a DOM element).
		 *
		 * @param showCallback {function($elem)} function to show a guider over $elem
		 *
		 * @singleton
		 */
		uiInteractionMgr = function () {
			var hoverTimer, lastOriginalTitleAttr, $redLinks, HOVER_TIMEOUT_MS,
				self;

			self = this;
			HOVER_TIMEOUT_MS = 700;

			// Get all red links on the page
			// TODO Find a sounder way to find red links (like adding a special
			// class to them on the server via a parser hook?)
			$redLinks = $('a.new');

			function getAnchorFromEvent( event ) {
				return $( event.target ).closest( 'a' );
			}

			// Click (pretty straightforward)
			function click( event ) {
				clearHoverTimer();
				self.showCallback( getAnchorFromEvent( event ) );
				return false;
			}

			// Hover (a lot more involved)
			hoverTimer = null;
			lastOriginalTitleAttr = null;

			function clearHoverTimer() {
				if ( hoverTimer != null ) {
					clearTimeout( hoverTimer );
					hoverTimer = null;
				}
			}

			// TODO If a tour is activated on hover, then moving the mouse off the
			// link and away from the callout should start a timer for
			// ending the tour.
			function mousein( event ) {
				var $a;

				$a =  getAnchorFromEvent(event);

				if ( hoverTimer === null ) {
					hoverTimer = setTimeout(function() {
						clearHoverTimer();
						self.showCallback( $a );
					}, HOVER_TIMEOUT_MS );
				}

				// Prevent native tooltip on link by removing title attribute
				// TODO check cross-browser effectiveness, soundness for accessibility
				lastOriginalTitleAttr = $a.attr( 'title' );
				$a.removeAttr( 'title' );
			}

			function mouseout ( event ) {
				clearHoverTimer();

				// Re-attach original title attribute
				getAnchorFromEvent( event ).attr( 'title', lastOriginalTitleAttr );
			}

			// Public (internal) API
			return {
				bind: function(showCallback) {
					self.showCallback = showCallback;
					$redLinks.click(click);
					$redLinks.hover(mousein, mouseout);
				},
				currentGuiderElem: null
			};
		}();

		/**
		 * High-level interface for creating HTML for guiders
		 * and modal dialogue. All public methods return HTML strings.
		 *
		 * TODO: Any JS template libs standard with Mediawiki?
		 * TODO: Make this more loosely coupled
		 *
		 * @singleton
		 */
		htmlFactory = function () {
			var CSS_CLASSES;

			/**
			 *  CSS classes. Must coordinate with articlecreationhelpredlinks.css.
			 *  redLinkAttach must also coordinate with tour.
			 */
			CSS_CLASSES = {
				'titleInCalloutClass': 'ext-art-c-h-title-in-callout',
				'firstLineInCallout': 'ext-art-c-h-1st-line-in-callout',
				'secondLineInCallout': 'ext-art-c-h-2nd-line-in-callout',
				'paragraphInCalloutClass': 'ext-art-c-h-par-in-callout',
				'buttonClass': 'mw-ui-button',
				'inlineButtonClass': 'mw-ui-primary ext-art-c-h-inline-button'
			};

			/**
			 * HTML of an inline button.
			 *
			 * @private
			 *
			 * @param name {string} the button's text
			 * @param options {Object} options for button
			 * @param options.url {string} The URL the button should link to
			 * @param options.callbackString {string} a string with js code to call on click
			 *
			 * @returns {string} HTML for button
			 */
			function makeInlineButton( name, id, options ) {
				var html, url;

				url = options.url || 'javascript:void(0)';

				html = [
					'<a href="',
					url,
					'" id="',
					id,
					'" class="',
					CSS_CLASSES.buttonClass,
					' ',
					CSS_CLASSES.inlineButtonClass,
					'"'
				].join('');

				if (options.callbackString) {
					html = [
						html,
						' onclick="var event = arguments[0] || window.event; event.stopPropagation(); ',
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

			/**
			 * Generate HTML for the "no article about" paragraphs.
			 */
			function makeFirstLine( pre, title, post ) {
				return [
		            '<p class="',
		            CSS_CLASSES.paragraphInCalloutClass,
		            ' ',
		            CSS_CLASSES.firstLineInCallout,
		            '">',
					pre,
					'<span class="',
					CSS_CLASSES.titleInCalloutClass,
					'">',
					title,
					'</span>',
					post,
					'</p>'
				].join('');
			}

			/**
			 * HTML of the "would you like to create one?" paragraph
			 *
			 * @private
			 */
			function makeCreateOne(buttonName, buttonOptions) {
				return [
		            '<p class="',
		            CSS_CLASSES.paragraphInCalloutClass,
		            '"><span class="',
		            CSS_CLASSES.secondLineInCallout,
		            '">',
		            mw.message( 'articlecreationhelp-redlinks-liketocreateone' ).text(),
		            '</span>&nbsp;',
		            makeInlineButton(
	            		buttonName,
	            		'createOne',
	            		buttonOptions
	        		),
					'</p>'
				].join('');
			}

			/**
			 * HTML for the "please sign up or log in" paragraph
			 *
			 * @private
			 */
			function makeSignUpOrLogIn() {
				var createAccountURL, signInURL;

				createAccountURL = mw.config.get( 'wgScript' ) + '?title=Special:UserLogin&type=signup';
				signInURL = mw.util.wikiGetlink( 'Special:UserLogin' );

				return [
					'<p class="',
					CSS_CLASSES.paragraphInCalloutClass,
					'"><span class="',
					CSS_CLASSES.secondLineInCallout,
					'">',
					mw.message( 'articlecreationhelp-firststep-pre' ).text(),
					'</span>',
					makeInlineButton(
						mw.message( 'articlecreationhelp-firststep-signup' ).text(),
						'signUp',
						{ url: createAccountURL }
					),
					'<span class="',
					CSS_CLASSES.secondLineInCallout,
					'">',
					mw.message( 'articlecreationhelp-firststep-or' ).text(),
					'</span>',
					makeInlineButton(
						mw.message( 'articlecreationhelp-firststep-login' ).text(),
						'logIn',
						{ url: signInURL }
					),
					'<span class="',
					CSS_CLASSES.secondLineInCallout,
					'">',
					mw.message( 'articlecreationhelp-firststep-post' ).text(),
					'</span></p>',
		        ].join('');
			}

			// Public (internal) API
			return {

				makeAnonStep0Desc: function(articleTitle, callbackString) {
					redTextMeans = makeFirstLine(
						mw.message( 'articlecreationhelp-redlinks-redtextmeanspre' ).text(),
						articleTitle,
						mw.message( 'articlecreationhelp-redlinks-redtextmeanspost' ).text() );

					return [
						redTextMeans,
		            	makeCreateOne(
		                	mw.message( 'articlecreationhelp-redlinks-learnmore' ).text(),
		                	{ callbackString: callbackString } )

					].join('');
				},

				makeAnonStep1Desc: function() {
					return makeSignUpOrLogIn();
				},

				makeLoggedInStep0Desc: function(articleTitle) {
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

					return [
						noArticle,
		                makeCreateOne(
		                	mw.message( 'articlecreationhelp-redlinks-createarticle' ).text(),
		                	{ url: createArticleURL } )

					].join('');
				},

				makeSpecialPageAnonModal: function() {
					return makeSignUpOrLogIn();
				}
			};
		}();

		// TODO implement logging
		logger = function (){}();

		/**
		 * Presenter. References other top-level objects, not referenced by
		 * any of them. Provides a public (internal) API at
		 * mw.articlecreationhelp.internal.
		 */
		mw.articlecreationhelp = {};
		mw.articlecreationhelp.internal = function () {

			var showTour, TOURS;

			// Tour names: coordinate with ArticleCreationHelp.php and
			// .js files for tours.
			TOURS = {
				'anonTourName':	'articlecreationhelpredlinksanon',
				'loggedInTourName':	'articlecreationhelpredlinksloggedin',
				'anonSpecialPageTourName':	'articlecreationhelpspecialpageanon',
			};

			// If we're on the special page and not logged in, just show the
			// user a modal dialogue.
			if ( state.onSpecialPage && !state.loggedIn ) {
//				tourSpec = mw.guidedTour.getTourSpec( TOURS.anonSpecialPageTourName );
//
//				tourSpec.steps[0].description = htmlFactory.makeSpecialPageAnonModal();
//				mw.guidedTour.launchTour( TOURS.anonSpecialPageTourName );

				return;
			}

			function closeTourHandler () {
				state.tourActive = false;
			};

			showTour = function ( $a ) {
				var tourController;

				// Don't launch a tour if one's already going for the same link
				if ( ( state.tourActive ) && ( state.focusedRedLink.same( $a ) ) ) {
					return;
				}

				state.tourActive = true;

				// TODO check if we're editing a page, and don't show callouts on
				// red links to the same page. (That can happen when editing a user
				// page or a user talk page.)

				if ( state.focusedRedLink ) {
					state.focusedRedLink.markForGuider( false );
				}
				state.focusedRedLink = new RedLink( $a );
				state.focusedRedLink.markForGuider( true );

				// TODO deal with other Mediawiki configurations
				// (for example, wikis where anonymous users can create articles).

				if ( state.loggedIn ) {

					// Red links tour for logged in users

					tourController = mw.guidedTour.getTourController( TOURS.loggedInTourName );
					tourController.reset();

					tourController.modifyStep( 0, {
							description: htmlFactory.makeLoggedInStep0Desc(
								state.focusedRedLink.articleTitle )
						} );

					tourController.launch();

				} else {

					// Red links tour for anonymous users

					tourController = mw.guidedTour.getTourController( TOURS.anonTourName );
					tourController.reset();

					tourController.modifyStep( 0, {
						description: htmlFactory.makeAnonStep0Desc(
							state.focusedRedLink.articleTitle,
							'mw.libs.guiders.next();' )
					} );

					tourController.modifyStep( 1, {
						description: htmlFactory.makeAnonStep1Desc( state.focusedRedLink.articleTitle ),
					} );


					tourController.launch();
				}
			};

			uiInteractionMgr.bind(showTour);

			// Public (internal) API, at mw.articlecreationhelp.internal
			return {
				closeTourHandler: closeTourHandler,
			};
		}();

	} );

} ( jQuery, mediaWiki ) );