<?php
/**
 * Generate notices in the WordPress admin
 *
 * @class   Object_Sync_Sf_Admin_Notice
 * @package Object_Sync_Salesforce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Object_Sync_Sf_Admin_Notice class.
 */
class Object_Sync_Sf_Admin_Notice {

	/**
	 * The main plugin file
	 *
	 * @var string
	 */
	public $file;

	/**
	 * The condition the notice is checking
	 *
	 * @var bool
	 */
	public $condition;

	/**
	 * The message that is being displayed
	 *
	 * @var string
	 */
	public $message;

	/**
	 * What type of notice it is
	 *
	 * @var string
	 */
	public $type;

	/**
	 * Whether the notice is dismisable or not
	 *
	 * @var bool
	 */
	public $dismissible;

	/**
	 * Which template is used for display
	 *
	 * @var string
	 */
	public $template;

	/**
	 * Constructor for admin notice class
	 *
	 * @param bool   $condition whether the condition for the notice was met.
	 * @param string $message the message to show to the user.
	 * @param bool   $dismissible whether the user can dismiss this message.
	 * @param string $type what type of message this is.
	 * @param string $template the template to render this message.
	 */
	public function __construct( $condition, $message, $dismissible, $type, $template ) {

		$this->file = object_sync_for_salesforce()->file;

		$this->condition   = $condition;
		$this->message     = $message;
		$this->dismissible = $dismissible;
		$this->type        = $type;
		$this->template    = $template;

		add_action( 'admin_notices', array( $this, 'render' ) );

	}

	/**
	 * Render an admin notice
	 */
	public function render() {

		$default_template = plugin_dir_path( $this->file ) . '/templates/admin/notice.php';

		// class for the notice to use.
		$class = '';
		if ( '' !== $this->type ) {
			$class = ' notice-' . $this->type;
		}

		$dismissible = '';
		if ( true === $this->dismissible ) {
			$dismissible = ' is-dismissible';
		}

		// template for notice has a default.
		if ( '' === $this->template || ! file_exists( $template ) ) {
			$template = $default_template;
		} else {
			$template = $this->template;
		}

		$condition = $this->condition;
		$message   = $this->message;

		require_once $template;

	}

}
