/**
 *  Main Javascript for ArticleCreationHelp.
 *
 *  Here's how the separation of concerns works here. There are three singletons and
 *  one class that know nothing about each other:
 *
 *    state             Holds info about current state and writes log entries
 *    uiInteractionMgr  Binds handlers for red links, manages low-level interaction
 *    htmlFactory       Produces HTML strings for inclusion in guiders
 *    RedLink           A wrapper for red links
 *
 *  Finally, there's a presenter that uses all of the above and contains the
 *  global logic.
 *
 */
( function ( $, mw ) {
	$( document ).ready( function () {
		var state, uiInteractionMgr, htmlFactory;

		/**
		 * Wrapper class for red links.
		 *
		 * @param {jQuery} $elem jQuery object representing a red link DOM element
		 *
		 */
		function RedLink ( $elem ) {
			var match;
			this.$elem = $elem;

			// CSS class detected by guiders for attachment. Must coordinate
			// with ext.articlecreationhelp.css and attachTo in tours
			this.RED_LINK_ATTACH_CLASS = 'ext-art-c-h-redlinkattach';

			// Extract article title
			// TODO Find a better way to do this, maybe with parser hooks?
			// Still, it seems to work.
			// TODO Leaves off namespace
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
		 * @param {jQuery} $otherElem jQuery object
		 *
		 * @returns true if $otherElem represents the same red link as this object, false if not
		 */
		RedLink.prototype.same = function ( $otherElem ) {
			return this.$elem[ 0 ] === $otherElem[ 0 ];
		};

		/**
		 * Mark a red link for attachment by a guider.
		 *
		 * @param {boolean} mark To mark or not to mark
		 */
		RedLink.prototype.markForGuider = function ( mark ) {
			if ( mark ) {
				this.$elem.addClass( this.RED_LINK_ATTACH_CLASS );
			} else {
				this.$elem.removeClass( this.RED_LINK_ATTACH_CLASS );
			}
		};

		/**
		 * Manages information on current state, and provides a method
		 * for writing a log entry.
		 *
		 * (Logging and state are closely linked, since log entries contain
		 * state information plus an action type.)
		 *
		 * @singleton
		 */
		state = ( function () {
			var isAnon, token, userId, pageTitle, pageId, pageNs, obj;

			isAnon = mw.user.isAnon();

			// TODO Using cookies here. Mention this in the extension's
			// documentation, check that it's OK according to privacy policy
			// and privacy laws.
			token = mw.user.id();

			userId = mw.config.get( 'wgUserId' );
			pageTitle = mw.config.get( 'wgTitle' );
			pageId = mw.config.get( 'wgArticleId' );
			pageNs = mw.config.get( 'wgNamespaceNumber' );

			// Public (internal) API
			obj = {
				isAnon: isAnon,
				activeTour: null,
				focusedRedLink: null,

				/**
				 * Log an action of the type indicated.
				 *
				 * @param {String} actionType See
				 *     https://meta.wikimedia.org/wiki/Schema:ArticleCreationHelp
				 *     for possible values.
				 */
				log: function ( actionType ) {
					var event = {
							isAnon: isAnon,
							token: token,
							action: actionType,
							redLinkTitle:
								// really focusedRedLink should always be set
								// when we get here, but just in case...
								obj.focusedRedLink ? obj.focusedRedLink.articleTitle : '',
							pageTitle: pageTitle,
							pageId: pageId,
							pageNs: pageNs
					} ;

					if ( userId ) {
						event.userId = userId;
					}

					mw.eventLog.logEvent( 'ArticleCreationHelp', event );
				}
			};

			return obj;
		}() );

		/**
		 * Sets up and manages low-level events on red links.
		 *
		 * If the user clicks on a red link, we show a guider.
		 *
		 * If the user hovers over a red link for a short time, we show a guider.
		 *
		 * If the guider appears due to hovering, and the mouse moves off the
		 * link and the guider, the guider automatically disappears after a
		 * few seconds.
		 *
		 * However, if the user clicks on the red link or on a guider button,
		 * the guider does not disappear automatically, and only disappears
		 * if the user closes it manually (by hitting escape, or clicking outside
		 * the guider or on the close button).
		 *
		 * The idea is that hovering is passive, so we shouldn't require the user
		 * to actively intervene to hide an element that appears due to hovering.
		 * However, by clicking somewhere (red link or guider), the user
		 * demonstrates that he or she is interested in these elements, so after
		 * that the guider shouldn't disappear without active intervention.
		 *
		 * @singleton
		 */
		uiInteractionMgr = ( function () {
			var HOVER_TIMEOUT_MS, HIDE_AFTER_HOVER_TIMEOUT_MS, self,
				hoverTimer, onlyHoverInteractionsReceived, hideAfterHoverTimer,
				lastOriginalTitleAttr, $redLinks;

			HOVER_TIMEOUT_MS = 700;
			HIDE_AFTER_HOVER_TIMEOUT_MS = 3000;

			self = this;

			hoverTimer = null;
			onlyHoverInteractionsReceived = null;
			hideAfterHoverTimer = null;
			lastOriginalTitleAttr = null;

			// Get all red links on the page
			// TODO Find a sounder way to find red links (like adding a special
			// class to them on the server via a parser hook?)
			$redLinks = $( 'a.new' );

			function getAnchorFromEvent( event ) {
				return $( event.target ).closest( 'a' );
			}

			// Click (pretty straightforward)
			function click( event ) {
				clearHoverTimer();
				showCallback( getAnchorFromEvent( event ), 'click' );

				// we've gotten a click, so cancel auto-hiding the guider
				clearHideAfterHoverTimer();
				onlyHoverInteractionsReceived = false;

				// prevent navegation to link
				return false;
			}

			// Hover (a lot more involved)
			function mousein( event ) {
				var $a;

				$a =  getAnchorFromEvent(event);

				clearHideAfterHoverTimer();
				if (onlyHoverInteractionsReceived === null) {
					onlyHoverInteractionsReceived = true;
				}

				if ( hoverTimer === null ) {
					hoverTimer = setTimeout(function() {
						clearHoverTimer();
						self.showCallback( $a, 'hover' );
					}, HOVER_TIMEOUT_MS );
				}

				// Prevent native tooltip on link by removing title attribute
				// TODO check cross-browser effectiveness, soundness for accessibility
				lastOriginalTitleAttr = $a.attr( 'title' );
				$a.removeAttr( 'title' );
			}

			function mouseout ( event ) {
				clearHoverTimer();

				// If we have only hover interactions so far, set a timer
				// to hide the guider after a short delay.
				// NOTE: this can happen even if the guider isn't showing, but
				// that's OK.
				if (onlyHoverInteractionsReceived !== false) {
					setHideAfterHoverTimer();
				}

				// Re-attach original title attribute
				getAnchorFromEvent( event ).attr( 'title', lastOriginalTitleAttr );
			}

			function clearHoverTimer() {
				if ( hoverTimer !== null ) {
					clearTimeout( hoverTimer );
					hoverTimer = null;
				}
			}

			function setHideAfterHoverTimer() {
				hideAfterHoverTimer = setTimeout( function() {
					self.hideCallback();
					onlyHoverInteractionsReceived = null;

				}, HIDE_AFTER_HOVER_TIMEOUT_MS );
			}

			function clearHideAfterHoverTimer() {
				if ( hideAfterHoverTimer !== null ) {
					clearTimeout( hideAfterHoverTimer );
					hideAfterHoverTimer = null;
				}
			}

			// Public (internal) API
			return {
				/**
				 * Bind handlers to UI, calling showCallback($elem) when a guider
				 * should be shown over the red link represented by $elem
				 * (a jQuery object wrapping a single DOM element).
				 *
				 * @param {Function} showCallback function to show a guider over
				 *     a red link
				 * @param {Function} hideCallback function to hide the current
				 *     guider over a red link
				 */
				bind: function( showCallback, hideCallback ) {
					self.showCallback = showCallback;
					self.hideCallback = hideCallback;
					$redLinks.click( click );
					$redLinks.hover( mousein, mouseout );
				},

				/**
				 * Notify that the mouse is over the guider.
				 */
				guiderEnter: function () {
					clearHideAfterHoverTimer();
				},

				/**
				 * Notify that the mouse has left the guider.
				 */
				guiderLeave: function () {
					if (onlyHoverInteractionsReceived !== false) {
						setHideAfterHoverTimer();
					}
				},

				/**
				 * Notify that the user clicked something on the guider.
				 */
				confirmNonHoverInteraction: function() {
					clearHideAfterHoverTimer();
					onlyHoverInteractionsReceived = false;
				},

				/**
				 * Reset state information about hover events (in preparation for
				 * showing a tour again).
				 */
				resetNonHoverInteractionState: function() {
					onlyHoverInteractionsReceived = null;
				}
			};
		}() );

		/**
		 * Factory for HTML for guiders. All public methods return HTML strings.
		 *
		 * Note regarding separation of concerns: this object is allowed to work
		 * directly with messages (via mw.message) but does not know the URLs
		 * or callbacks for changing state, which are provided by the
		 * caller (the presenter).
		 *
		 * TODO: This class uses a simple, inbuilt templating mechanism.
		 * If in the future MW includes a standard JS templating system, that should
		 * be used instead.
		 *
		 * @singleton
		 */
		htmlFactory = ( function () {

			// Templates appear below, just before public (internal) API

			// *********** Template processing

			/**
			 * Produce output from a template.
			 *
			 * @private
			 *
			 * @param {String} id id of the template to use
			 * @param {Object} vars object whose properties are variables to be
			 *     used in the template
			 */
			// vars variable name must coincide with the name used in
			// prepareTemplate()
			function executeTemplate( id, vars ) {
				var template = templates[ id ];

				if ( !template ) {
					throw 'Cannot find template ' + id;
				}
				return eval( template );
			}

			/**
			 * Turn a human-readable template string into JS code to be run
			 * using eval().
			 *
			 * @private
			 *
			 * @param {String} the template string to prepare
			 */
			function prepareTemplate( templStr ) {
				var compiledTmpl, lastIdx, varStrTrimmed, varStrMatch;

				// turn newlines into spaces
				// if a space appears  before or after an html tag, it'll
				// be stripped out further on
				templStr = templStr.replace( /\n/g, ' ' );

				// replace pairs of literal and var sections (e.g., 'lit{var}')
				lastIdx = 0;
				compiledTmpl = templStr.replace
					( /([^{}]*){([^{}]*)}/g,
					function( m, lit, varStr, offset ){
						var newStr;
						if ( lit ) {
							newStr = makeTemplateLit( lit ) + ',';
						} else {
							newStr = '';
						}

						// vars variable name must coincide with the name
						// used in executeTemplate()
						if ( varStr ) {

							varStrTrimmed = $.trim( varStr );
							varStrMatch = varStrTrimmed.match( /^#(.*)/ );

							if ( varStrMatch ){

								// '#' means make an inline button using the
								// options contained in this variable
								newStr += 'makeInlineButton(vars[\''
									+ varStrMatch[1] + '\']),';

							} else {

								// no '#' means insert the variable's string value
								newStr += 'vars[\'' + varStrTrimmed + '\'],';
							}
						}

						lastIdx += lit.length + varStr.length + 2;
						return newStr;
				} );

				// replace the final literal section if there is one
				if ( lastIdx < templStr.length ) {
					var lastLit = templStr.slice( lastIdx, templStr.length );
					compiledTmpl = compiledTmpl.slice(
						0, compiledTmpl.length - lastLit.length )
						+ makeTemplateLit( lastLit );
				}

				// remove trailing comma and wrap as an array join
				compiledTmpl = compiledTmpl.replace( /\,$/, '' );
				compiledTmpl = '[' + compiledTmpl + '].join(\'\')';

				return compiledTmpl;
			}

			/**
			 * Format a string for inclusion as a literal in a template.
			 *
			 * @private
			 */
			function makeTemplateLit(str) {
				// strip out whitespace before and after tags
				var retStr = str.replace( />\s*/, '>' );
				retStr = retStr.replace( /\s*</, '<' );

				// surround by quotes, escape quotes within
				return '\'' + retStr.replace( /'/g, '\\\'' ) + '\'';
			}

			/**
			 * HTML of an inline button.
			 *
			 * @private
			 *
			 * @param {Object} options options for button
			 * @param {String} options.name the button's text
			 * @param {String} options.url The URL the button should link to
			 *    (optional)
			 * @param {String} options.callbackString a string with js code to
			 *     call on click (optional)
			 *
			 * @returns {string} HTML for button
			 */
			function makeInlineButton( options ) {
				var vars = {
					name: options.name,
					actionAttrs: makeActionAttrs(
							options.url,
							options.callbackString,
							true)
				};

				return executeTemplate( 'inlineBtn', vars );
			}

			/**
			 * HTML snippet for link action attributes (href and onclick)
			 *
			 * @private
			 */
			function makeActionAttrs( url, callbackStr, stopPropagation ) {
				var href, onClick;

				href = 'href="' + ( url || 'javascript:void(0)' ) + '"';

				if (callbackStr) {

					if (stopPropagation) {
						onClick =
							'var event = arguments[0] || window.event; event.stopPropagation(); '
							+ callbackStr;
					} else {
						onClick = callbackStr;
					}

					return href + ' onclick="' + onClick + '"';
				} else {
					return href;
				}
			}

			// *********** Templates

			// Note: CSS classes must coordinate with ext.articlecreationhelp.css.
			/**
			 * Template format:
			 *    {varName}    Inserts a value passed to executeTemplate via
			 *                 the vars parameter (in this case, vars.varName).
			 *    {#btnOpts}   Inserts an inline button using options passed in
			 *                 via the vars parameter (in this case, vars.btnOpts).
			 *                 Options available: name, url, callbackString.
			 *
			 *    Everything else in the template is rendered as is--except that
			 *    whitespace between tags is stripped out.
			 *
			 */
			var templates = {
				container:
					'<div class="ext-art-c-h-inner-container">{content}</div>',

				dividedContainer:
					'<div class="ext-art-c-h-top-inner-container">{topContent}</div>' +
					'<div class="ext-art-c-h-bottom-inner-container">{bottomContent}</div>',

				firstLine:
					'<p class="ext-art-c-h-guider-headline">' +
					'    {pre}<span class="ext-art-c-h-art-title">{title}</span>{post}' +
					'</p>',

				createOne:
					'<p>' +
					'    <span class="ext-art-c-h-suggestion-text">{msg}</span>&nbsp;{#button}' +
					'</p>',

				signUpOrLogIn:
					'<p>' +
					'    <span class="ext-art-c-h-suggestion-text">{pre}</span>' +
					'    {#signUpBtn}' +
					'    <span class="ext-art-c-h-suggestion-text">{or}</span>' +
					'    {#logInBtn}' +
					'    <span class="ext-art-c-h-suggestion-text">{post}</span>' +
					'</p>',

				readMore:
					'<p>' +
					'    <span class="ext-art-c-h-readmore">' +
					'    {pre}' +
					'    <a href="{url}">{linkText}</a>' +
					'    {post}' +
					'    </span>' +
					'</p>',

				inlineBtn:
					'<a' +
					'    {actionAttrs}' + // href and (optionally) onclick attrs go here
					'    class="mw-ui-button mw-ui-primary ext-art-c-h-inline-button">' +
					'    {name}' +
					'</a>'
			};

			// prepare templates for execution
			// this happens only once, when the module is loaded
			for ( t in templates ) {
				templates[ t ] = prepareTemplate( templates[ t ] );
			}

			// *********** Public (internal) API
			return {

				/**
				 * Create HTML for the first guider over red links for
				 * anonymous users.
				 *
				 * @param {String} articleTitle The title of the (non-existent)
				 *    article referred to by the red link that the guider points
				 *    to.
				 * @param {String} learnMoreCallbackStr String with onClick callback
				 *    for "Learn More" button.
				 * @returns {String} HTML string
				 */
				makeAnonStep0Desc: function( articleTitle, learnMoreCallbackStr ) {
					var firstLine, secondLine;

					firstLine = executeTemplate( 'firstLine',
						{
							pre: mw.message( 'articlecreationhelp-redlinks-redtextmeans-pre' ).text(),
							title: articleTitle,
							post: mw.message( 'articlecreationhelp-redlinks-redtextmeans-post' ).text()
						}
					);

					secondLine = executeTemplate( 'createOne',
						{
							msg: mw.message( 'articlecreationhelp-redlinks-liketocreateone' ).text(),
							button:
								{
									name: mw.message( 'articlecreationhelp-redlinks-learnmore' ).text(),
									callbackString: learnMoreCallbackStr
								}
						}
					);

					return executeTemplate('container', {
						content: firstLine + secondLine
					} );
				},

				/**
				 * Create HTML for the second guider over red links for
				 * anonymous users.
				 *
				 * @param {String} signUpURL URL for the "Create an account" button
				 * @param {String} logInURL URL for the "Log in" button
				 * @param {String} readMoreURL URL for the link to more information
				 * @returns {String} HTML
				 */
				makeAnonStep1Desc: function( signUpURL, logInURL, readMoreURL ) {
					var signUpOrLogIn, readMore;

					signUpOrLogIn = executeTemplate( 'signUpOrLogIn',
						{
							pre: mw.message( 'articlecreationhelp-redlinks-firststep-pre' ).text(),
							signUpBtn:
								{
									name: mw.message( 'articlecreationhelp-redlinks-firststep-signup' ).text(),
									url: signUpURL
								},
							or: mw.message( 'articlecreationhelp-redlinks-firststep-or' ).text(),
							logInBtn:
								{
									name: mw.message( 'articlecreationhelp-redlinks-firststep-login' ).text(),
									url: logInURL
								},
							post: mw.message( 'articlecreationhelp-redlinks-firststep-post' ).text()
						}
					);


					readMore = executeTemplate( 'readMore',
						{
							pre: mw.message( 'articlecreationhelp-redlinks-readmore-pre' ).text(),
							url: readMoreURL,
							linkText: mw.message( 'articlecreationhelp-redlinks-readmore-link' ).text(),
							post: mw.message( 'articlecreationhelp-redlinks-readmore-post' ).text()
						}
					);

					return executeTemplate( 'dividedContainer', {
						topContent: signUpOrLogIn,
						bottomContent: readMore
					} );
				},

				/**
				 * Create HTML for the guider over red links for
				 * logged-in users.
				 *
				 * @param {String} articleTitle The title of the (non-existent)
				 *    article referred to by the red link that the guider points
				 *    to.
				 * @param {String} createArticleURL URL for the "Create article" button
				 * @returns {String} HTML string
				 *
				 */
				makeLoggedInStep0Desc: function( articleTitle, createArticleURL ) {

					var firstLine, secondLine;

					firstLine = executeTemplate( 'firstLine',
						{
							pre: mw.message( 'articlecreationhelp-redlinks-noarticle-pre' ).text(),
							title: articleTitle,
							post: mw.message( 'articlecreationhelp-redlinks-noarticle-post' ).text()
						}
					);

					secondLine = executeTemplate( 'createOne',
						{
							msg: mw.message( 'articlecreationhelp-redlinks-liketocreateone' ).text(),
							button:
								{
									name: mw.message( 'articlecreationhelp-redlinks-createarticle' ).text(),
									url: createArticleURL
								}
						}
					);

					return executeTemplate( 'container', {
						content: firstLine + secondLine
					} );
				}
			};
		}() );

		/**
		 * Presenter. Uses other top-level objects, but is not referenced by
		 * any of them. Provides an API (internal, i.e., not intended for use
		 * outside this extension) at mw.articlecreationhelp.internal.
		 */
		mw.articlecreationhelp = {};
		mw.articlecreationhelp.internal = ( function () {

			var TOURS, signUpURL, logInURL, readMoreURL, showTour, hideTour;

			// Tour names: coordinate with ArticleCreationHelp.php and
			// .js files for tours.
			TOURS = {
				'anonTourName':	'articlecreationhelpredlinksanon',
				'loggedInTourName':	'articlecreationhelpredlinksloggedin',
			};

			// set up URLs that don't change depending on the red link we're over
			signUpURL = new mw.Uri( mw.util.wikiGetlink( 'Special:UserLogin' ) )
				.extend( { type: 'signup' } );

			logInURL = mw.util.wikiGetlink( 'Special:UserLogin' );
			readMoreURL = 'https://en.wikipedia.org/wiki/Wikipedia:Notability';

			// *********** Handlers for events and user actions

			/**
			 * Called when a tour is closed. Resets state.
			 *
			 */
			function closeTourHandler () {
				state.activeTour = null;
				uiInteractionMgr.resetNonHoverInteractionState();
			};

			/**
			 * Called by GuidedTour when the mouse enters a guider. We just
			 * pass the info along to the uiInteractionMgr.
			 */
			function guiderMouseEnter () {
				uiInteractionMgr.guiderEnter();
			}

			/**
			 * Called by GuidedTour when the mouse leaves a guider. We just
			 * pass the info along to the uiInteractionMgr.
			 */
			function guiderMouseLeave () {
				uiInteractionMgr.guiderLeave();
			}

			/**
			 * Called when the user clicks on "Learn more" (1st guider for
			 * anonymous users).
			 */
			function learnMoreClick () {
				state.log( 'learn-more-click' );
				uiInteractionMgr.confirmNonHoverInteraction();
				mw.libs.guiders.next();
			}

			// *********** Showing and hiding tours

			/**
			 * Called by uiInteractionMgr to show a tour (sent as a callback).
			 *
			 * @param {jQuery} $a jQuery wrapper for the red link element that
			 *     the guiders should point to.
			 * @param {String} interactionType The type of interaction that
			 *     caused this this request for a tour. Can by 'click" or 'hover'.
			 */
			showTour = function ( $a, interactionType ) {
				var tourController, articleTitle, createArticleURL;

				// Don't log or launch a tour if one's already going for the same
				// link
				if ( ( state.activeTour ) && ( state.focusedRedLink.same( $a ) ) ) {
					return;
				}

				// TODO check if we're editing a page, and don't show callouts on
				// red links to the same page. (That can happen when editing a user
				// page or a user talk page.)

				// update red link state
				if ( state.focusedRedLink ) {
					state.focusedRedLink.markForGuider( false );
				}
				state.focusedRedLink = new RedLink( $a );
				state.focusedRedLink.markForGuider( true );

				// TODO deal with other Mediawiki configurations,
				// (for example, wikis where anonymous users can create articles).

				// show a tour

				articleTitle = state.focusedRedLink.articleTitle;
				if ( state.isAnon ) {

					// Red links tour for anonymous users

					state.activeTour = TOURS.anonTourName;

					tourController = mw.guidedTour.getTourController( state.activeTour );
					tourController.reset();

					tourController.modifyStep( 0, {
						description: htmlFactory.makeAnonStep0Desc(
							articleTitle,
							'mw.articlecreationhelp.internal.learnMoreClick();' )
					} );

					tourController.modifyStep( 1, {
						description: htmlFactory.makeAnonStep1Desc(
						signUpURL, logInURL, readMoreURL),

					} );

					tourController.launch();

				} else {

					// Red links tour for logged in users

					state.activeTour = TOURS.loggedInTourName;

					tourController = mw.guidedTour.getTourController( state.activeTour );
					tourController.reset();

					createArticleURL = new mw.Uri( mw.util.wikiGetlink( 'Special:ArticleCreationHelp' ) )
						.extend( {
							newtitle: articleTitle,
							returnto: mw.config.get( 'wgPageName' )
						}
					);

					tourController.modifyStep( 0, {
						description: htmlFactory.makeLoggedInStep0Desc(
							articleTitle, createArticleURL )
					} );

					tourController.launch();
				}

				// log red link interaction
				switch (interactionType) {
					case 'hover':
						state.log('red-link-hover');
						break;
					case 'click':
						state.log('red-link-click');
						break;
					default:
						// should never get here
						break;
				}
			};

			/**
			 * Called by uiInteractionMgr to hide a tour (sent as a callback).
			 */
			hideTour = function () {
				if ( state.activeTour ) {
					mw.guidedTour.getTourController( state.activeTour ).cancel();
				}
			};

			uiInteractionMgr.bind( showTour, hideTour );

			// *********** Public API (intended for internal use), made available
			// at mw.articlecreationhelp.internal
			return {
				closeTourHandler: closeTourHandler,
				guiderMouseEnter: guiderMouseEnter,
				guiderMouseLeave: guiderMouseLeave,
				learnMoreClick: learnMoreClick
			};
		}() );

	} );

} ( jQuery, mediaWiki ) );
