/**
 *  Main Javascript for ArticleCreationHelp.
 *
 *  Here's how the separation of concerns works here. There are four singletons and
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
		 * Higher-level wrapper class for red links.
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
		 * Manages information on current state.
		 *
		 * @singleton
		 */
		state = ( function () {
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
		}() );

		/**
		 * Sets up and manages low-level events on red links.
		 *
		 * @singleton
		 */
		uiInteractionMgr = ( function () {
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
				/**
				 * Bind handlers to UI, calling showCallback($elem) when a guider
				 * should be shown over the red link represented by $elem
				 * (a jQuery object wrapping a single DOM element).
				 *
				 * @param {Function} showCallback function to show a guider over
				 *     a red link
				 */
				bind: function(showCallback) {
					self.showCallback = showCallback;
					$redLinks.click(click);
					$redLinks.hover(mousein, mouseout);
				},
				currentGuiderElem: null
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
			function executeTemplate(id, vars) {
				var template = templates[id];

				if (!template) {
					throw 'Cannot find template ' + id;
				}
				return eval(template);
			}

			/**
			 * Turn a human-readable template string into JS code to be run
			 * using eval().
			 *
			 * @private
			 *
			 * @param {String} the template string to prepare
			 */
			function prepareTemplate(templStr) {
				var compiledTmpl, lastIdx, varStrTrimmed, varStrMatch;

				// turn newlines into spaces
				// if a space appears  before or after an html tag, it'll
				// be stripped out further on
				templStr = templStr.replace(/\n/g, ' ');

				// replace pairs of literal and var sections (e.g., 'lit{var}')
				lastIdx = 0;
				compiledTmpl = templStr.replace
					(/([^{}]*){([^{}]*)}/g,
					function(m, lit, varStr, offset){
						var newStr;
						if (lit) {
							newStr = makeTemplateLit(lit) + ',';
						} else {
							newStr = '';
						}

						// vars variable name must coincide with the name
						// used in executeTemplate()
						if (varStr) {

							varStrTrimmed = $.trim(varStr);
							varStrMatch = varStrTrimmed.match(/^#(.*)/);

							if (varStrMatch){

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
				if (lastIdx < templStr.length) {
					var lastLit = templStr.slice(lastIdx, templStr.length);
					compiledTmpl = compiledTmpl.slice(
						0, compiledTmpl.length - lastLit.length)
						+ makeTemplateLit(lastLit);
				}

				// remove trailing comma and wrap as an array join
				compiledTmpl = compiledTmpl.replace(/\,$/,'');
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
				var retStr = str.replace(/>\s*/, '>');
				retStr = retStr.replace(/\s*</, '<');

				// surround by quotes, escape quotes within
				return '\'' + retStr.replace(/'/g,'\\\'') + '\'';
			}

			/**
			 * HTML of an inline button.
			 *
			 * @private
			 *
			 * @param {Object} options options for button
			 * @param {String} options.name the button's text
			 * @param {String} options.url The URL the button should link to
			 * @param {String} options.callbackString a string with js code to
			 *     call on click
			 *
			 * @returns {string} HTML for button
			 */
			function makeInlineButton( options ) {
				var vars, url;
				vars = {
					name: options.name
				};
				url = 'href="' + ( options.url || 'javascript:void(0)' ) + '" ';

				if ( options.callbackString ) {
					vars.actionAttrs = url
						+ 'onclick="'
						+ 'var event = arguments[0] || window.event; event.stopPropagation();'
						+ options.callbackString
						+ '"';

				} else {
					vars.actionAttrs = url;
				}

				return executeTemplate( 'inlineBtn', vars );
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
			for (t in templates) {
				templates[t] = prepareTemplate(templates[t]);
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
				makeAnonStep0Desc: function(articleTitle, learnMoreCallbackStr) {
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
				makeAnonStep1Desc: function(signUpURL, logInURL, readMoreURL) {
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


					readMore = executeTemplate('readMore',
						{
							pre: mw.message( 'articlecreationhelp-redlinks-readmore-pre' ).text(),
							url: readMoreURL,
							linkText: mw.message( 'articlecreationhelp-redlinks-readmore-link' ).text(),
							post: mw.message( 'articlecreationhelp-redlinks-readmore-post' ).text()
						}
					);

					return executeTemplate('dividedContainer', {
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
				makeLoggedInStep0Desc: function(articleTitle, createArticleURL) {

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

					return executeTemplate('container', {
						content: firstLine + secondLine
					} );
				}
			};
		}() );

		// TODO implement logging
		logger = ( function (){}() );

		/**
		 * Presenter. Uses other top-level objects, but is not referenced by
		 * any of them. Provides an API (internal, i.e., not intended for use
		 * outside  this extension) at mw.articlecreationhelp.internal.
		 */
		mw.articlecreationhelp = {};
		mw.articlecreationhelp.internal = ( function () {

			var showTour, TOURS, signUpURL, logInURL, readMoreURL;

			// Tour names: coordinate with ArticleCreationHelp.php and
			// .js files for tours.
			TOURS = {
				'anonTourName':	'articlecreationhelpredlinksanon',
				'loggedInTourName':	'articlecreationhelpredlinksloggedin',
			};

			// set up URLs that don't change depending
			// on the red link we're over
			signUpURL = new mw.Uri( mw.util.wikiGetlink( 'Special:UserLogin' ) )
				.extend( { type: 'signup' } );

			logInURL = mw.util.wikiGetlink( 'Special:UserLogin' );
			readMoreURL = 'https://en.wikipedia.org/wiki/Wikipedia:Notability';

			function closeTourHandler () {
				state.tourActive = false;
			};

			showTour = function ( $a ) {
				var tourController, articleTitle, createArticleURL;

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
				articleTitle = state.focusedRedLink.articleTitle;

				// TODO deal with other Mediawiki configurations,
				// (for example, wikis where anonymous users can create articles).

				if ( state.loggedIn ) {

					// Red links tour for logged in users

					tourController = mw.guidedTour.getTourController( TOURS.loggedInTourName );
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

				} else {

					// Red links tour for anonymous users

					tourController = mw.guidedTour.getTourController( TOURS.anonTourName );
					tourController.reset();

					tourController.modifyStep( 0, {
						description: htmlFactory.makeAnonStep0Desc(
							articleTitle,
							'mw.libs.guiders.next();' )
					} );

					tourController.modifyStep( 1, {
						description: htmlFactory.makeAnonStep1Desc(
						signUpURL, logInURL, readMoreURL),

					} );

					tourController.launch();
				}
			};

			uiInteractionMgr.bind( showTour );

			// API (intended for internal use) at mw.articlecreationhelp.internal
			return {
				closeTourHandler: closeTourHandler,
			};
		}() );

	} );

} ( jQuery, mediaWiki ) );
