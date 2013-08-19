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

		// Add modules
		$output->addModules( array(
			'ext.articlecreationhelp.specialpage',
// 			'ext.guidedTour.tour.articlecreationhelpredlinksanon',
		) );
		
		// The page to retreat<<<<<<<return to
		$returnTo = $request->getText('returnto');
		
		// The page to create
		$newTitle = $request->getText('newtitle');
		
		// special page title
		$output->setPageTitle( 
			$this->msg( 'articlecreationhelp-specialpage-title' ) 
			. $newTitle );
		
		// Introductory text
		$output->addWikiText(
			$this->msg( 'articlecreationhelp-specialpage-noarticlepre' )
			. $newTitle
			. $this->msg( 'articlecreationhelp-specialpage-noarticlepost' )
		);
		
		$output->addWikiText(
			$this->msg( 'articlecreationhelp-specialpage-tocreateit' )
		);
	}
}