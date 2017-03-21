<?php
/**
 * @file
 */

if ( ! class_exists( 'Salesforce_Rest_API' ) ) {
    die();
}

/**
 * Generate notices in the WordPress admin
 */
class Admin_Notice {

    protected $condition;
    protected $message;
    protected $domain;
    protected $dismissible;
    protected $type;
    protected $template;

    /**
    * Constructor which sets up the admin_notices hook for rendering
    *
    * @param mixed $condition
    * @param string $message
    * @param string $domain
    * @param bool $dismissible
    * @param string $type
    * @param string $template
    *
    */
    public function __construct( $condition, $message, $domain, $dismissible = false, $type = '', $template = '' ) {
        $this->condition = $condition;
        $this->message = $message;
        $this->domain = $domain;
        $this->dismissible = $dismissible;
        $this->type = $type;
        $this->template = $template;

        add_action( 'admin_notices', array( $this, 'render' ) );

    }

    /**
    * Render an admin notice
    *
    */
    public function render() {

        // class for the notice to use
        $class = '';
        if ( '' !== $this->type ) {
            $class = ' notice-' . $this->type;
        }

        $dismissible = '';
        if ( true === $this->dismissible ) {
            $dismissible = ' is-dismissible';
        }

        // template for notice has a default
        if ( '' === $this->template ) {
            $template = plugin_dir_path( __FILE__ ) . '/../templates/admin/notice.php';
        } else {
            $template = $this->template;
        }

        $condition = $this->condition;
        $message = $this->message;
        $text_domain = $this->domain;

        require_once( $template );

    }

}