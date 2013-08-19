<?php
class SpecialArticleCreationHelp extends SpecialPage {
	
	public function __construct() {
		parent::__construct( 'ArticleCreationHelp' );
	}
	
	public function execute( $parameter ) {
		// Required to initialize output page object $wgOut
		$this->setHeaders();
		
		// Get handles for output to page and input from URL parameters 
		$output = $this->getOutput();
		$request = $this->getRequest();

		// The page to return to if we wish
		$returnTo = $request->getText('returnto');
		
		// The page to create
		$newTitle = $request->getText('newtitle');
		
		// Landing page title
		$output->setPageTitle( 
			$this->msg( 'articlecreationhelp-landingpage-title' ) 
			. $newTitle );
		
		// Introductory text
		$output->addWikiText(
			$this->msg( 'articlecreationhelp-landingpage-noarticlepre' )
			. $newTitle
			. $this->msg( 'articlecreationhelp-landingpage-noarticlepost' )
		);
		
		$output->addWikiText(
			$this->msg( 'articlecreationhelp-landingpage-tocreateit' )
		);
	}
}