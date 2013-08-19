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
	
	// TODO: where should this come from???
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
	
		$vars[ 'wgArticleCreationHelpRedLinks' ] = array(
			'loggedIn' => !( $out->getUser()->isAnon() ),
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
