<?php
class SpecialArticleCreationHelp extends SpecialPage {
	
	public function __construct() {
		parent::__construct( 'ArticleCreationHelp' );
	}
	
	public function execute( $parameter ) {
		
		global $wgScript, $wgSitename, $wgUser;
		
		// If the user isn't allow to create a page, redirect to permissions error page
		if ( !$wgUser->isAllowed('createpage') ) {
			// TODO Do this properly, via Title.php
			throw new PermissionsError( 'createpage', array( array( 'nocreate-loggedin' ) ) );
		}
		
		// Required to initialize output page object $wgOut
		$this->setHeaders();
		
		// Get handles for output to page and input from URL parameters 
		$output = $this->getOutput();
		$request = $this->getRequest();

		// Add modules
		$output->addModules( array(
			'ext.articlecreationhelp.specialpage',
 			'ext.guidedTour.tour.articlecreationhelpspecialpageanon',
		) );
		
		// TODO Error handling if we don't get the parameters we're expecting
		
		// The page to retreat<<<<<<<return to
		$returnTo = $request->getText('returnto');
		
		// The article to create
		$newTitle = $request->getText('newtitle');
		
		// Special page title
		$output->setPageTitle( 
			$this->msg( 'articlecreationhelp-specialpage-titlepre' ) 
			. $newTitle
			. $this->msg( 'articlecreationhelp-specialpage-titlepost' ) );
		
		// Header
		$header = 
			$this->msg( 'articlecreationhelp-specialpage-headerpre' )
			. $newTitle
			. $this->msg( 'articlecreationhelp-specialpage-headerpost' );
		
		// Tasks
		$editURL = $wgScript . '?title=' . $newTitle . '&action=edit';
		$editImgSrc = '//upload.wikimedia.org/wikipedia/commons/d/de/Icon-pencil.png';
		$editHeader = $this->msg( 'articlecreationhelp-specialpage-edit-header' );
		$editText =
			$this->msg( 'articlecreationhelp-specialpage-edit-textpre' )
			. $wgSitename
			. $this->msg( 'articlecreationhelp-specialpage-edit-textpost' );

		$sandboxURL = '?title=User:' . $output->getUser()->getName() . '/sandbox&action=edit';
		$sandboxImgSrc = '//upload.wikimedia.org/wikipedia/commons/3/37/Icon-wrench.png';
		$sandboxHeader = $this->msg( 'articlecreationhelp-specialpage-sandbox-header' );
		$sandboxText = $this->msg( 'articlecreationhelp-specialpage-sandbox-text' );;

		$result = <<< EOF
			<div class="ext-art-c-h-specialpage-container">
				<div class="ext-art-c-h-specialpage-text">
					<p>$header</p>
				</div>
				<div class="ext-art-c-h-specialpage-tasks">
					<a href="$editURL" title="">
						<div class="ext-art-c-h-specialpage-task-icon">
							<img alt="" src="$editImgSrc" />
						</div>
						<div class="ext-art-c-h-specialpage-task-text">
							<h4>$editHeader</h4>
							<p>$editText</p>
						</div>
					</a>
					<a href="$sandboxURL" title="">
						<div class="ext-art-c-h-specialpage-task-icon">
							<img alt="" src="$sandboxImgSrc" />
						</div>
						<div class="ext-art-c-h-specialpage-task-text">
							<h4>$sandboxHeader</h4>
							<p>$sandboxText</p>
						</div>
					</a>
				</div>
				<div class="ext-art-c-h-specialpage-text">
					<p>
EOF;
		$output->addHTML( $result );
		
		// Return to previous page
		$output->addWikiText( 
				$this->msg( 'articlecreationhelp-specialpage-returnpre' )
				. '[['
				. str_replace( '_', ' ', $returnTo) // TODO Is this how it's done?
				. ']]'
				. $this->msg( 'articlecreationhelp-specialpage-returnpost' )
		);
		
		// End tags		
		$result = <<< EOF
				</div>
			</div>
EOF;
		$output->addHTML( $result );
	}
}
//createArticleURL = mw.util.wikiGetlink( 'Special:ArticleCreationHelp/' + articleTitle ) ;