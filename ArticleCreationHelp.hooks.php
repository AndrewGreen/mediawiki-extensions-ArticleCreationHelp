<?php
/**
 * Hooks for ArticleCreationHelp extension
 *
 * @file
 * @author Andrew Green andrew.green.df@gmail.com
 * @ingroup Extensions
 */

class ArticleCreationHelpHooks {

	
	const SCHEMA_NAME = 'ArticleCreationHelpRedLinks';
	
	// TODO: Where should this come from??? I just made it up.
	const SCHEMA_REV_ID = 2314223;
	
	/**
	 * MakeGlobalVariablesScript hook.
	 * This is used to add user-specific config vars to mw.config.
	 *
	 * @param $vars array
	 * @param $out OutputPage output page
	 * @return bool
	 */
	public static function onMakeGlobalVariablesScript( &$vars, OutputPage $out ) {
	
		global $wgTitle;

		$loggedIn = !( $out->getUser()->isAnon());
		
		// De-activate red link callouts it we're on the special page
		// and user isn't logged in
		// TODO fix client code to make this unnecessary
		$suspendRedLinkTours =
			(!($loggedIn) && 
			($wgTitle == 'Special:ArticleCreationHelp'));
		
		$vars[ 'wgArticleCreationHelpRedLinks' ] = array(
			'loggedIn' => $loggedIn,
			'suspendRedLinkTours' => $suspendRedLinkTours,
		);
		
		// TODO: Implement case for users who have disabled article creation help
		// TODO: Implement control and test groups for A/B testing

		return true;
	}
	
	/**
	 * Adds redlink module to the page
	 *
	 * @param OutputPage $out output page
	 * @param Skin $skin current skin
	 * @return bool
	 */
	public static function onBeforePageDisplay( OutputPage $out, Skin $skin ) {
		// Load up our module and tours
		$out->addModules( array(
			'ext.articlecreationhelp.redlinks',
			'ext.guidedTour.tour.articlecreationhelpredlinksanon',
			'ext.guidedTour.tour.articlecreationhelpredlinksloggedin',
		) );

		// TODO: Implement case for users who have disabled article creation help
		// TODO: Implement control and test groups for A/B testing
		
		return true;
	}
}
