<?php
/**
 * This extension aims to help users learn to create new articles
 * effectively. It provides popups over red links and an article creation
 * landing page. 
 * 
 * Bits and pieces were pillaged<<<<<<<<adapted from the GettingStarted and
 * GuidedTour extensions.
 * 
 * For more information, please see:
 * https://www.mediawiki.org/w/index.php?title=Extension:ArticleCreationHelp
 * 
 * @file
 * @author Andrew Green andrew.green.df@gmail.com
 */

/**
 * Prevent a user from accessing this file directly and provide a helpful
 * message explaining how to install this extension.
 */
if (! defined ( 'MEDIAWIKI' )) {
	echo <<<EOT
To install the Article Creation Help extension, put the following line in your
LocalSettings.php file:
require_once( "\$IP/extensions/ArticleCreationHelp/ArticleCreationHelp.php" );
EOT;
	exit ( 1 );
}

// Information for Special:Version
$wgExtensionCredits [ 'specialpage' ][] = array (
	'path' => __FILE__,
	'name' => 'ArticleCreationHelp',
	'author' => array (
		'Andrew Green', 
	),
	'url' => 'https://www.mediawiki.org/wiki/Extension:ArticleCreationHelp',
	'descriptionmsg' => 'articlecreationhelp-desc',
	'version' => '0.1',
);

// Autoloading
$wgAutoloadClasses += array(
	'ArticleCreationHelpHooks'   => __DIR__ . '/ArticleCreationHelp.hooks.php',
	'SpecialArticleCreationHelp' => __DIR__ . '/SpecialArticleCreationHelp.php',
);

// Schema for event logging
$articleCreationHelpSchemaModuleName = 'schema.' . ArticleCreationHelpHooks::SCHEMA_NAME;

$wgResourceModules[ $articleCreationHelpSchemaModuleName ] = array(
		'class'    => 'ResourceLoaderSchemaModule',
		'schema'   => ArticleCreationHelpHooks::SCHEMA_NAME,
		'revision' => ArticleCreationHelpHooks::SCHEMA_REV_ID,
);

// Module info used repeatedly below
$articleCreationHelpModuleInfo = array(
		'localBasePath' => __DIR__ . '/modules',
		'remoteExtPath' => 'ArticleCreationHelp/modules',
);

// Global module		
$wgResourceModules[ 'ext.articlecreationhelp' ] = array(
	'scripts' => 'ext.articlecreationhelp.js',
	'styles' => 'ext.articlecreationhelp.css',
	'dependencies' => array(
		'ext.guidedTour',
		'mediawiki.Uri',
		$articleCreationHelpSchemaModuleName,
	),
	'messages' => array(
		'articlecreationhelp-redlinks-redtextmeans-pre',
		'articlecreationhelp-redlinks-redtextmeans-post',
		'articlecreationhelp-redlinks-learnmore',
		'articlecreationhelp-redlinks-liketocreateone',
		'articlecreationhelp-redlinks-createarticle',
		'articlecreationhelp-redlinks-noarticle-pre',
		'articlecreationhelp-redlinks-noarticle-post',
		'articlecreationhelp-redlinks-firststep-pre',
		'articlecreationhelp-redlinks-firststep-createaccount',
		'articlecreationhelp-redlinks-firststep-or',
		'articlecreationhelp-redlinks-firststep-login',
		'articlecreationhelp-redlinks-firststep-post',
		'articlecreationhelp-redlinks-readmore-pre',
		'articlecreationhelp-redlinks-readmore-link',
		'articlecreationhelp-redlinks-readmore-post'
	),
) + $articleCreationHelpModuleInfo;

// Tour for red links for anonymous users
$wgResourceModules['ext.guidedTour.tour.articlecreationhelpredlinksanon'] = array(
	'scripts' => 'ext.articlecreationhelp.redlinks.anon.js',
	'dependencies' => array(
			'ext.guidedTour',
			'ext.articlecreationhelp',
	),
) + $articleCreationHelpModuleInfo;

// Tour for red links for logged in users
$wgResourceModules['ext.guidedTour.tour.articlecreationhelpredlinksloggedin'] = array(
	'scripts' => 'ext.articlecreationhelp.redlinks.loggedin.js',
	'dependencies' => array(
			'ext.guidedTour',
			'ext.articlecreationhelp',
	),
) + $articleCreationHelpModuleInfo;

// Special page module
$wgResourceModules[ 'ext.articlecreationhelp.specialpage' ] = array(
		'styles' => 'ext.articlecreationhelp.specialpage.css',
		'dependencies' => array(
				'ext.guidedTour',
		),
) + $articleCreationHelpModuleInfo;

// Hooks
$wgHooks[ 'MakeGlobalVariablesScript' ][] = 'ArticleCreationHelpHooks::onMakeGlobalVariablesScript';
$wgHooks[ 'BeforePageDisplay' ][] = 'ArticleCreationHelpHooks::onBeforePageDisplay';

// Messages
$wgExtensionMessagesFiles[ 'ArticleCreationHelp' ] = __DIR__ . '/ArticleCreationHelp.i18n.php';
$wgExtensionMessagesFiles[ 'ArticleCreationHelpAlias' ] = __DIR__ . '/ArticleCreationHelp.alias.php';

// Special Page
$wgSpecialPages[ 'ArticleCreationHelp' ] = 'SpecialArticleCreationHelp';
