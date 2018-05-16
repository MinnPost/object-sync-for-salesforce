<?php
/**
 * Class file for the Object_Sync_Sf_Admin class.
 *
 * @file
 */

if ( ! class_exists( 'Object_Sync_Salesforce' ) ) {
	die();
}

/**
 * Create default WordPress admin functionality to configure the plugin.
 */
class Object_Sync_Sf_Admin {

	protected $wpdb;
	protected $version;
	protected $login_credentials;
	protected $slug;
	protected $salesforce;
	protected $wordpress;
	protected $mappings;
	protected $push;
	protected $pull;
	protected $schedulable_classes;

	/**
	* @var string
	* Default path for the Salesforce authorize URL
	*/
	public $default_authorize_url_path;

	/**
	* @var string
	* Default path for the Salesforce token URL
	*/
	public $default_token_url_path;

	/**
	* @var string
	* What version of the Salesforce API should be the default on the settings screen.
	* Users can edit this, but they won't see a correct list of all their available versions until WordPress has
	* been authenticated with Salesforce.
	*/
	public $default_api_version;

	/**
	* @var bool
	* Default for whether to limit to triggerable items
	* Users can edit this
	*/
	public $default_triggerable;

	/**
	* @var bool
	* Default for whether to limit to updateable items
	* Users can edit this
	*/
	public $default_updateable;

	/**
	* @var int
	* Default pull throttle for how often Salesforce can pull
	* Users can edit this
	*/
	public $default_pull_throttle;

	/**
	* Constructor which sets up admin pages
	*
	* @param object $wpdb
	* @param string $version
	* @param array $login_credentials
	* @param string $slug
	* @param object $wordpress
	* @param object $salesforce
	* @param object $mappings
	* @param object $push
	* @param object $pull
	* @param object $logging
	* @param array $schedulable_classes
	* @throws \Exception
	*/
	public function __construct( $wpdb, $version, $login_credentials, $slug, $wordpress, $salesforce, $mappings, $push, $pull, $logging, $schedulable_classes ) {
		$this->wpdb                = $wpdb;
		$this->version             = $version;
		$this->login_credentials   = $login_credentials;
		$this->slug                = $slug;
		$this->wordpress           = $wordpress;
		$this->salesforce          = $salesforce;
		$this->mappings            = $mappings;
		$this->push                = $push;
		$this->pull                = $pull;
		$this->logging             = $logging;
		$this->schedulable_classes = $schedulable_classes;

		$this->sfwp_transients = $this->wordpress->sfwp_transients;

		// default authorize url path
		$this->default_authorize_url_path = '/services/oauth2/authorize';
		// default token url path
		$this->default_token_url_path = '/services/oauth2/token';
		// what Salesforce API version to start the settings with. This is only used in the settings form
		$this->default_api_version = '42.0';
		// default pull throttle for avoiding going over api limits
		$this->default_pull_throttle = 5;
		// default setting for triggerable items
		$this->default_triggerable = true;
		// default setting for updateable items
		$this->default_updateable = true;
		// default option prefix
		$this->option_prefix = 'object_sync_for_salesforce_';

		$this->add_actions();

	}

	/**
	* Create the action hooks to create the admin page(s)
	*
	*/
	public function add_actions() {
		add_action( 'admin_init', array( $this, 'salesforce_settings_forms' ) );
		add_action( 'admin_init', array( $this, 'notices' ) );
		add_action( 'admin_post_post_fieldmap', array( $this, 'prepare_fieldmap_data' ) );

		add_action( 'admin_post_delete_fieldmap', array( $this, 'delete_fieldmap' ) );
		add_action( 'wp_ajax_get_salesforce_object_description', array( $this, 'get_salesforce_object_description' ) );
		add_action( 'wp_ajax_get_wordpress_object_description', array( $this, 'get_wordpress_object_fields' ) );
		add_action( 'wp_ajax_get_wp_sf_object_fields', array( $this, 'get_wp_sf_object_fields' ) );
		add_action( 'wp_ajax_push_to_salesforce', array( $this, 'push_to_salesforce' ) );
		add_action( 'wp_ajax_pull_from_salesforce', array( $this, 'pull_from_salesforce' ) );
		add_action( 'wp_ajax_refresh_mapped_data', array( $this, 'refresh_mapped_data' ) );
		add_action( 'wp_ajax_clear_sfwp_cache', array( $this, 'clear_sfwp_cache' ) );

		add_action( 'edit_user_profile', array( $this, 'show_salesforce_user_fields' ) );
		add_action( 'personal_options_update', array( $this, 'save_salesforce_user_fields' ) );
		add_action( 'edit_user_profile_update', array( $this, 'save_salesforce_user_fields' ) );

		add_action( 'admin_post_delete_object_map', array( $this, 'delete_object_map' ) );
		add_action( 'admin_post_post_object_map', array( $this, 'prepare_object_map_data' ) );

		// import and export plugin data
		add_action( 'admin_post_object_sync_for_salesforce_import', array( $this, 'import_json_file' ) );
		add_action( 'admin_post_object_sync_for_salesforce_export', array( $this, 'export_json_file' ) );

	}

	/**
	* Create WordPress admin options page
	*
	*/
	public function create_admin_menu() {
		$title = __( 'Salesforce', 'object-sync-for-salesforce' );
		add_options_page( $title, $title, 'configure_salesforce', 'object-sync-salesforce-admin', array( $this, 'show_admin_page' ) );
	}

	/**
	* Render full admin pages in WordPress
	* This allows other plugins to add tabs to the Salesforce settings screen
	*
	* todo: better front end: html, organization of html into templates, css, js
	*
	*/
	public function show_admin_page() {
		$get_data = filter_input_array( INPUT_GET, FILTER_SANITIZE_STRING );
		echo '<div class="wrap">';
		echo '<h1>' . esc_html( get_admin_page_title() ) . '</h1>';
		$allowed = $this->check_wordpress_admin_permissions();
		if ( false === $allowed ) {
			return;
		}
		$tabs = array(
			'settings'      => __( 'Settings', 'object-sync-for-salesforce' ),
			'authorize'     => __( 'Authorize', 'object-sync-for-salesforce' ),
			'fieldmaps'     => __( 'Fieldmaps', 'object-sync-for-salesforce' ),
			'schedule'      => __( 'Scheduling', 'object-sync-for-salesforce' ),
			'import-export' => __( 'Import &amp; Export', 'object-sync-for-salesforce' ),
		); // this creates the tabs for the admin

		// optionally make tab(s) for logging and log settings
		$logging_enabled      = get_option( $this->option_prefix . 'enable_logging', false );
		$tabs['log_settings'] = __( 'Log Settings', 'object-sync-for-salesforce' );

		$mapping_errors = $this->mappings->get_failed_object_maps();
		if ( ! empty( $mapping_errors ) ) {
			$tabs['mapping_errors'] = __( 'Mapping Errors', 'object-sync-for-salesforce' );
		}

		// filter for extending the tabs available on the page
		// currently it will go into the default switch case for $tab
		$tabs = apply_filters( 'object_sync_for_salesforce_settings_tabs', $tabs );

		$tab = isset( $get_data['tab'] ) ? sanitize_key( $get_data['tab'] ) : 'settings';
		$this->tabs( $tabs, $tab );

		$consumer_key    = $this->login_credentials['consumer_key'];
		$consumer_secret = $this->login_credentials['consumer_secret'];
		$callback_url    = $this->login_credentials['callback_url'];

		if ( true !== $this->salesforce['is_authorized'] ) {
			$url     = esc_url( $callback_url );
			$anchor  = esc_html__( 'Authorize tab', 'object-sync-for-salesforce' );
			$message = sprintf( 'Salesforce needs to be authorized to connect to this website. Use the <a href="%s">%s</a> to connect.', $url, $anchor );
			require( plugin_dir_path( __FILE__ ) . '/../templates/admin/error.php' );
		}

		if ( 0 === count( $this->mappings->get_fieldmaps() ) ) {
			$url     = esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=fieldmaps' ) );
			$anchor  = esc_html__( 'Fieldmaps tab', 'object-sync-for-salesforce' );
			$message = sprintf( 'No fieldmaps exist yet. Use the <a href="%s">%s</a> to map WordPress and Salesforce objects to each other.', $url, $anchor );
			require( plugin_dir_path( __FILE__ ) . '/../templates/admin/error.php' );
		}

		$push_schedule_number = get_option( $this->option_prefix . 'salesforce_push_schedule_number', '' );
		$push_schedule_unit   = get_option( $this->option_prefix . 'salesforce_push_schedule_unit', '' );
		$pull_schedule_number = get_option( $this->option_prefix . 'salesforce_pull_schedule_number', '' );
		$pull_schedule_unit   = get_option( $this->option_prefix . 'salesforce_pull_schedule_unit', '' );

		if ( '' === $push_schedule_number && '' === $push_schedule_unit && '' === $pull_schedule_number && '' === $pull_schedule_unit ) {
			$url     = esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=schedule' ) );
			$anchor  = esc_html__( 'Scheduling tab', 'object-sync-for-salesforce' );
			$message = sprintf( 'Because the plugin schedule has not been saved, the plugin cannot run automatic operations. Use the <a href="%s">%s</a> to create schedules to run.', $url, $anchor );
			require( plugin_dir_path( __FILE__ ) . '/../templates/admin/error.php' );
		}

		try {
			switch ( $tab ) {
				case 'authorize':
					if ( isset( $get_data['code'] ) ) {
						// this string is an oauth token
						$data          = esc_html( wp_unslash( $get_data['code'] ) );
						$is_authorized = $this->salesforce['sfapi']->request_token( $data );
						?>
						<script>window.location = '<?php echo esc_url_raw( $callback_url ); ?>'</script>
						<?php
					} elseif ( true === $this->salesforce['is_authorized'] ) {
							require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/authorized.php' );
							$this->status( $this->salesforce['sfapi'] );
					} elseif ( true === is_object( $this->salesforce['sfapi'] ) && isset( $consumer_key ) && isset( $consumer_secret ) ) {
						?>
						<p><a class="button button-primary" href="<?php echo esc_url( $this->salesforce['sfapi']->get_authorization_code() ); ?>"><?php echo esc_html__( 'Connect to Salesforce', 'object-sync-for-salesforce' ); ?></a></p>
						<?php
					} else {
						$url    = esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=settings' ) );
						$anchor = esc_html__( 'Settings', 'object-sync-for-salesforce' );
						// translators: placeholders are for the settings tab link: 1) the url, and 2) the anchor text
						$message = sprintf( esc_html__( 'Salesforce needs to be authorized to connect to this website but the credentials are missing. Use the <a href="%1$s">%2$s</a> tab to add them.', 'object-sync-salesforce' ), $url, $anchor );
						require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/error.php' );
					}
					break;
				case 'fieldmaps':
					if ( isset( $get_data['method'] ) ) {

						$method      = sanitize_key( $get_data['method'] );
						$error_url   = get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=fieldmaps&method=' . $method );
						$success_url = get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=fieldmaps' );

						if ( isset( $get_data['transient'] ) ) {
							$transient = sanitize_key( $get_data['transient'] );
							$posted    = $this->sfwp_transients->get( $transient );
						}

						if ( isset( $posted ) && is_array( $posted ) ) {
							$map = $posted;
						} elseif ( 'edit' === $method || 'clone' === $method || 'delete' === $method ) {
							$map = $this->mappings->get_fieldmaps( isset( $get_data['id'] ) ? sanitize_key( $get_data['id'] ) : '' );
						}

						if ( isset( $map ) && is_array( $map ) ) {
							$label                           = $map['label'];
							$salesforce_object               = $map['salesforce_object'];
							$salesforce_record_types_allowed = maybe_unserialize( $map['salesforce_record_types_allowed'] );
							$salesforce_record_type_default  = $map['salesforce_record_type_default'];
							$wordpress_object                = $map['wordpress_object'];
							$pull_trigger_field              = $map['pull_trigger_field'];
							$fieldmap_fields                 = $map['fields'];
							$sync_triggers                   = $map['sync_triggers'];
							$push_async                      = $map['push_async'];
							$push_drafts                     = $map['push_drafts'];
							$weight                          = $map['weight'];
						}

						if ( 'add' === $method || 'edit' === $method || 'clone' === $method ) {
							require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/fieldmaps-add-edit-clone.php' );
						} elseif ( 'delete' === $method ) {
							require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/fieldmaps-delete.php' );
						}
					} else {
						$fieldmaps = $this->mappings->get_fieldmaps();
						require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/fieldmaps-list.php' );
					} // End if().
					break;
				case 'logout':
					$this->logout();
					break;
				case 'clear_cache':
					$this->clear_cache();
					break;
				case 'clear_schedule':
					if ( isset( $get_data['schedule_name'] ) ) {
						$schedule_name = sanitize_key( $get_data['schedule_name'] );
					}
					$this->clear_schedule( $schedule_name );
					break;
				case 'settings':
					require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/settings.php' );
					break;
				case 'mapping_errors':
					if ( isset( $get_data['method'] ) ) {

						$method      = sanitize_key( $get_data['method'] );
						$error_url   = get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=mapping_errors&method=' . $method );
						$success_url = get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=mapping_errors' );

						if ( isset( $get_data['map_transient'] ) ) {
							$transient = sanitize_key( $get_data['map_transient'] );
							$posted    = $this->sfwp_transients->get( $transient );
						}

						if ( isset( $posted ) && is_array( $posted ) ) {
							$map_row = $posted;
						} elseif ( 'edit' === $method || 'delete' === $method ) {
							$map_row = $this->mappings->get_failed_object_map( isset( $get_data['id'] ) ? sanitize_key( $get_data['id'] ) : '' );
						}

						if ( isset( $map_row ) && is_array( $map_row ) ) {
							$salesforce_id = $map_row['salesforce_id'];
							$wordpress_id  = $map_row['wordpress_id'];
						}

						if ( 'edit' === $method ) {
							require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/mapping-errors-edit.php' );
						} elseif ( 'delete' === $method ) {
							require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/mapping-errors-delete.php' );
						}
					} else {
						require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/mapping-errors.php' );
					}
					break;
				case 'import-export':
					require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/import-export.php' );
					break;
				default:
					$include_settings = apply_filters( 'object_sync_for_salesforce_settings_tab_include_settings', true, $tab );
					$content_before   = apply_filters( 'object_sync_for_salesforce_settings_tab_content_before', null, $tab );
					$content_after    = apply_filters( 'object_sync_for_salesforce_settings_tab_content_after', null, $tab );
					if ( null !== $content_before ) {
						echo esc_html( $content_before );
					}
					if ( true === $include_settings ) {
						require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/settings.php' );
					}
					if ( null !== $content_after ) {
						echo esc_html( $content_after );
					}
					break;
			} // End switch().
		} catch ( SalesforceApiException $ex ) {
			echo sprintf( '<p>Error <strong>%1$s</strong>: %2$s</p>',
				absint( $ex->getCode() ),
				esc_html( $ex->getMessage() )
			);
		} catch ( Exception $ex ) {
			echo sprintf( '<p>Error <strong>%1$s</strong>: %2$s</p>',
				absint( $ex->getCode() ),
				esc_html( $ex->getMessage() )
			);
		} // End try().
		echo '</div>';
	}

	/**
	* Create default WordPress admin settings form for salesforce
	* This is for the Settings page/tab
	*
	*/
	public function salesforce_settings_forms() {
		$get_data = filter_input_array( INPUT_GET, FILTER_SANITIZE_STRING );
		$page     = isset( $get_data['tab'] ) ? sanitize_key( $get_data['tab'] ) : 'settings';
		$section  = isset( $get_data['tab'] ) ? sanitize_key( $get_data['tab'] ) : 'settings';

		$input_callback_default   = array( $this, 'display_input_field' );
		$input_checkboxes_default = array( $this, 'display_checkboxes' );
		$input_select_default     = array( $this, 'display_select' );
		$link_default             = array( $this, 'display_link' );

		$all_field_callbacks = array(
			'text'       => $input_callback_default,
			'checkboxes' => $input_checkboxes_default,
			'select'     => $input_select_default,
			'link'       => $link_default,
		);

		$this->fields_settings( 'settings', 'settings', $all_field_callbacks );
		$this->fields_fieldmaps( 'fieldmaps', 'objects' );
		$this->fields_scheduling( 'schedule', 'schedule', $all_field_callbacks );
		$this->fields_log_settings( 'log_settings', 'log_settings', $all_field_callbacks );
	}

	/**
	* Fields for the Settings tab
	* This runs add_settings_section once, as well as add_settings_field and register_setting methods for each option
	*
	* @param string $page
	* @param string $section
	* @param string $input_callback
	*/
	private function fields_settings( $page, $section, $callbacks ) {
		add_settings_section( $page, ucwords( $page ), null, $page );
		$salesforce_settings = array(
			'consumer_key'             => array(
				'title'    => __( 'Consumer Key', 'object-sync-for-salesforce' ),
				'callback' => $callbacks['text'],
				'page'     => $page,
				'section'  => $section,
				'args'     => array(
					'type'     => 'text',
					'validate' => 'sanitize_validate_text',
					'desc'     => '',
					'constant' => 'OBJECT_SYNC_SF_SALESFORCE_CONSUMER_KEY',
				),

			),
			'consumer_secret'          => array(
				'title'    => __( 'Consumer Secret', 'object-sync-for-salesforce' ),
				'callback' => $callbacks['text'],
				'page'     => $page,
				'section'  => $section,
				'args'     => array(
					'type'     => 'text',
					'validate' => 'sanitize_validate_text',
					'desc'     => '',
					'constant' => 'OBJECT_SYNC_SF_SALESFORCE_CONSUMER_SECRET',
				),
			),
			'callback_url'             => array(
				'title'    => __( 'Callback URL', 'object-sync-for-salesforce' ),
				'callback' => $callbacks['text'],
				'page'     => $page,
				'section'  => $section,
				'args'     => array(
					'type'     => 'url',
					'validate' => 'sanitize_validate_text',
					'desc'     => '',
					'constant' => 'OBJECT_SYNC_SF_SALESFORCE_CALLBACK_URL',
				),
			),
			'login_base_url'           => array(
				'title'    => __( 'Login Base URL', 'object-sync-for-salesforce' ),
				'callback' => $callbacks['text'],
				'page'     => $page,
				'section'  => $section,
				'args'     => array(
					'type'     => 'url',
					'validate' => 'sanitize_validate_text',
					// translators: 1) production salesforce login, 2) sandbox salesforce login
					'desc'     => sprintf( __( 'For most Salesforce setups, you should use %1$s for production and %2$s for sandbox.', 'object-sync-for-salesforce' ),
						esc_url( 'https://login.salesforce.com' ),
						esc_url( 'https://test.salesforce.com' )
					),
					'constant' => 'OBJECT_SYNC_SF_SALESFORCE_LOGIN_BASE_URL',
				),
			),
			'authorize_url_path'       => array(
				'title'    => __( 'Authorize URL Path', 'object-sync-for-salesforce' ),
				'callback' => $callbacks['text'],
				'page'     => $page,
				'section'  => $section,
				'args'     => array(
					'type'     => 'text',
					'validate' => 'sanitize_validate_text',
					'desc'     => __( 'For most Salesforce installs, this should not be changed.', 'object-sync-for-salesforce' ),
					'constant' => 'OBJECT_SYNC_SF_SALESFORCE_AUTHORIZE_URL_PATH',
					'default'  => $this->default_authorize_url_path,
				),
			),
			'token_url_path'           => array(
				'title'    => 'Token URL Path',
				'callback' => $callbacks['text'],
				'page'     => $page,
				'section'  => $section,
				'args'     => array(
					'type'     => 'text',
					'validate' => 'sanitize_validate_text',
					'desc'     => __( 'For most Salesforce installs, this should not be changed.', 'object-sync-for-salesforce' ),
					'constant' => 'OBJECT_SYNC_SF_SALESFORCE_TOKEN_URL_PATH',
					'default'  => $this->default_token_url_path,
				),
			),
			'api_version'              => array(
				'title'    => 'Salesforce API Version',
				'callback' => $callbacks['text'],
				'page'     => $page,
				'section'  => $section,
				'args'     => array(
					'type'     => 'text',
					'validate' => 'sanitize_validate_text',
					'desc'     => '',
					'constant' => 'OBJECT_SYNC_SF_SALESFORCE_API_VERSION',
					'default'  => $this->default_api_version,
				),
			),
			'object_filters'           => array(
				'title'    => 'Limit Salesforce Objects',
				'callback' => $callbacks['checkboxes'],
				'page'     => $page,
				'section'  => $section,
				'args'     => array(
					'type'     => 'checkboxes',
					'validate' => 'sanitize_validate_text',
					'desc'     => __( 'Allows you to limit which Salesforce objects can be mapped', 'object-sync-for-salesforce' ),
					'items'    => array(
						'triggerable' => array(
							'text'    => 'Only Triggerable objects',
							'id'      => 'triggerable',
							'desc'    => '',
							'default' => $this->default_triggerable,
						),
						'updateable'  => array(
							'text'    => 'Only Updateable objects',
							'id'      => 'updateable',
							'desc'    => '',
							'default' => $this->default_updateable,
						),
					),
				),
			),
			'pull_throttle'            => array(
				'title'    => 'Pull throttle (seconds)',
				'callback' => $callbacks['text'],
				'page'     => $page,
				'section'  => $section,
				'args'     => array(
					'type'     => 'number',
					'validate' => 'sanitize_validate_text',
					'desc'     => __( 'Number of seconds to wait between repeated salesforce pulls. Prevents the webserver from becoming overloaded in case of too many cron runs, or webhook usage.', 'object-sync-for-salesforce' ),
					'constant' => '',
					'default'  => $this->default_pull_throttle,
				),
			),
			'debug_mode'               => array(
				'title'    => 'Debug mode?',
				'callback' => $callbacks['text'],
				'page'     => $page,
				'section'  => $section,
				'args'     => array(
					'type'     => 'checkbox',
					'validate' => 'sanitize_validate_text',
					'desc'     => __( 'Debug mode can, combined with the Log Settings, log things like Salesforce API requests. It can create a lot of entries if enabled; it is not recommended to use it in a production environment.', 'object-sync-for-salesforce' ),
					'constant' => '',
				),
			),
			'delete_data_on_uninstall' => array(
				'title'    => 'Delete plugin data on uninstall?',
				'callback' => $callbacks['text'],
				'page'     => $page,
				'section'  => $section,
				'args'     => array(
					'type'     => 'checkbox',
					'validate' => 'sanitize_validate_text',
					'desc'     => __( 'If checked, the plugin will delete the tables and other data it creates when you uninstall it. Unchecking this field can be useful if you need to reactivate the plugin for any reason without losing data.', 'object-sync-for-salesforce' ),
					'constant' => '',
				),
			),
		);

		if ( true === is_object( $this->salesforce['sfapi'] ) && true === $this->salesforce['sfapi']->is_authorized() ) {
			$salesforce_settings['api_version'] = array(
				'title'    => 'Salesforce API Version',
				'callback' => $callbacks['select'],
				'page'     => $page,
				'section'  => $section,
				'args'     => array(
					'type'     => 'select',
					'validate' => 'sanitize_validate_text',
					'desc'     => '',
					'constant' => 'OBJECT_SYNC_SF_SALESFORCE_API_VERSION',
					'items'    => $this->version_options(),
				),
			);
		}

		foreach ( $salesforce_settings as $key => $attributes ) {
			$id       = $this->option_prefix . $key;
			$name     = $this->option_prefix . $key;
			$title    = $attributes['title'];
			$callback = $attributes['callback'];
			$validate = $attributes['args']['validate'];
			$page     = $attributes['page'];
			$section  = $attributes['section'];
			$args     = array_merge(
				$attributes['args'],
				array(
					'title'     => $title,
					'id'        => $id,
					'label_for' => $id,
					'name'      => $name,
				)
			);

			// if there is a constant and it is defined, don't run a validate function
			if ( isset( $attributes['args']['constant'] ) && defined( $attributes['args']['constant'] ) ) {
				$validate = '';
			}

			add_settings_field( $id, $title, $callback, $page, $section, $args );
			register_setting( $page, $id, array( $this, $validate ) );
		}
	}

	/**
	* Fields for the Fieldmaps tab
	* This runs add_settings_section once, as well as add_settings_field and register_setting methods for each option
	*
	* @param string $page
	* @param string $section
	* @param string $input_callback
	*/
	private function fields_fieldmaps( $page, $section, $input_callback = '' ) {
		add_settings_section( $page, ucwords( $page ), null, $page );
	}

	/**
	* Fields for the Scheduling tab
	* This runs add_settings_section once, as well as add_settings_field and register_setting methods for each option
	*
	* @param string $page
	* @param string $section
	* @param string $input_callback
	*/
	private function fields_scheduling( $page, $section, $callbacks ) {
		foreach ( $this->schedulable_classes as $key => $value ) {
			add_settings_section( $key, $value['label'], null, $page );
			$schedule_settings = array(
				$key . '_schedule_number' => array(
					'title'    => __( 'Run schedule every', 'object-sync-for-salesforce' ),
					'callback' => $callbacks['text'],
					'page'     => $page,
					'section'  => $key,
					'args'     => array(
						'type'     => 'number',
						'validate' => 'absint',
						'desc'     => '',
						'constant' => '',
					),
				),
				$key . '_schedule_unit'   => array(
					'title'    => __( 'Time unit', 'object-sync-for-salesforce' ),
					'callback' => $callbacks['select'],
					'page'     => $page,
					'section'  => $key,
					'args'     => array(
						'type'     => 'select',
						'validate' => 'sanitize_validate_text',
						'desc'     => '',
						'items'    => array(
							'minutes' => array(
								'text'  => 'Minutes',
								'value' => 'minutes',
							),
							'hours'   => array(
								'text'  => 'Hours',
								'value' => 'hours',
							),
							'days'    => array(
								'text'  => 'Days',
								'value' => 'days',
							),
						),
					),
				),
				$key . '_clear_button'    => array(
					// translators: $this->get_schedule_count is an integer showing how many items are in the current queue
					'title'    => sprintf( 'This queue has ' . _n( '%s item', '%s items', $this->get_schedule_count( $key ), 'object-sync-for-salesforce' ), $this->get_schedule_count( $key ) ),
					'callback' => $callbacks['link'],
					'page'     => $page,
					'section'  => $key,
					'args'     => array(
						'label'      => 'Clear this queue',
						'desc'       => '',
						'url'        => esc_url( '?page=object-sync-salesforce-admin&amp;tab=clear_schedule&amp;schedule_name=' . $key ),
						'link_class' => 'button button-secondary',
					),
				),
			);
			foreach ( $schedule_settings as $key => $attributes ) {
				$id       = $this->option_prefix . $key;
				$name     = $this->option_prefix . $key;
				$title    = $attributes['title'];
				$callback = $attributes['callback'];
				$page     = $attributes['page'];
				$section  = $attributes['section'];
				$args     = array_merge(
					$attributes['args'],
					array(
						'title'     => $title,
						'id'        => $id,
						'label_for' => $id,
						'name'      => $name,
					)
				);
				add_settings_field( $id, $title, $callback, $page, $section, $args );
				register_setting( $page, $id );
			}
		} // End foreach().
	}

	/**
	* Fields for the Log Settings tab
	* This runs add_settings_section once, as well as add_settings_field and register_setting methods for each option
	*
	* @param string $page
	* @param string $section
	* @param array $callbacks
	*/
	private function fields_log_settings( $page, $section, $callbacks ) {
		add_settings_section( $page, ucwords( str_replace( '_', ' ', $page ) ), null, $page );
		$log_settings = array(
			'enable_logging'        => array(
				'title'    => __( 'Enable Logging?', 'object-sync-for-salesforce' ),
				'callback' => $callbacks['text'],
				'page'     => $page,
				'section'  => $section,
				'args'     => array(
					'type'     => 'checkbox',
					'validate' => 'absint',
					'desc'     => '',
					'constant' => '',
				),
			),
			'statuses_to_log'       => array(
				'title'    => __( 'Statuses to log', 'object-sync-for-salesforce' ),
				'callback' => $callbacks['checkboxes'],
				'page'     => $page,
				'section'  => $section,
				'args'     => array(
					'type'     => 'checkboxes',
					'validate' => 'sanitize_validate_text',
					'desc'     => __( 'these are the statuses to log', 'object-sync-for-salesforce' ),
					'items'    => array(
						'error'   => array(
							'text' => __( 'Error', 'object-sync-for-salesforce' ),
							'id'   => 'error',
							'desc' => '',
						),
						'success' => array(
							'text' => __( 'Success', 'object-sync-for-salesforce' ),
							'id'   => 'success',
							'desc' => '',
						),
						'notice'  => array(
							'text' => __( 'Notice', 'object-sync-for-salesforce' ),
							'id'   => 'notice',
							'desc' => '',
						),
						'debug'   => array(
							'text' => __( 'Debug', 'object-sync-for-salesforce' ),
							'id'   => 'debug',
							'desc' => '',
						),
					),
				),
			),
			'prune_logs'            => array(
				'title'    => __( 'Automatically delete old log entries?', 'object-sync-for-salesforce' ),
				'callback' => $callbacks['text'],
				'page'     => $page,
				'section'  => $section,
				'args'     => array(
					'type'     => 'checkbox',
					'validate' => 'absint',
					'desc'     => '',
					'constant' => '',
				),
			),
			'logs_how_old'          => array(
				'title'    => __( 'Age to delete log entries', 'object-sync-for-salesforce' ),
				'callback' => $callbacks['text'],
				'page'     => $page,
				'section'  => $section,
				'args'     => array(
					'type'     => 'text',
					'validate' => 'sanitize_validate_text',
					'desc'     => __( 'If automatic deleting is enabled, it will affect logs this old.', 'object-sync-for-salesforce' ),
					'default'  => '2 weeks',
					'constant' => '',
				),
			),
			'logs_how_often_number' => array(
				'title'    => __( 'Check for old logs every', 'object-sync-for-salesforce' ),
				'callback' => $callbacks['text'],
				'page'     => $page,
				'section'  => $section,
				'args'     => array(
					'type'     => 'number',
					'validate' => 'absint',
					'desc'     => '',
					'default'  => '1',
					'constant' => '',
				),
			),
			'logs_how_often_unit'   => array(
				'title'    => __( 'Time unit', 'object-sync-for-salesforce' ),
				'callback' => $callbacks['select'],
				'page'     => $page,
				'section'  => $section,
				'args'     => array(
					'type'     => 'select',
					'validate' => 'sanitize_validate_text',
					'desc'     => __( 'These two fields are how often the site will check for logs to delete.', 'object-sync-for-salesforce' ),
					'items'    => array(
						'minutes' => array(
							'text'  => __( 'Minutes', 'object-sync-for-salesforce' ),
							'value' => 'minutes',
						),
						'hours'   => array(
							'text'  => __( 'Hours', 'object-sync-for-salesforce' ),
							'value' => 'hours',
						),
						'days'    => array(
							'text'  => __( 'Days', 'object-sync-for-salesforce' ),
							'value' => 'days',
						),
					),
				),
			),
			'triggers_to_log'       => array(
				'title'    => __( 'Triggers to log', 'object-sync-for-salesforce' ),
				'callback' => $callbacks['checkboxes'],
				'page'     => $page,
				'section'  => $section,
				'args'     => array(
					'type'     => 'checkboxes',
					'validate' => 'sanitize_validate_text',
					'desc'     => __( 'these are the triggers to log', 'object-sync-for-salesforce' ),
					'items'    => array(
						$this->mappings->sync_wordpress_create => array(
							'text' => __( 'WordPress create', 'object-sync-for-salesforce' ),
							'id'   => 'wordpress_create',
							'desc' => '',
						),
						$this->mappings->sync_wordpress_update => array(
							'text' => __( 'WordPress update', 'object-sync-for-salesforce' ),
							'id'   => 'wordpress_update',
							'desc' => '',
						),
						$this->mappings->sync_wordpress_delete => array(
							'text' => __( 'WordPress delete', 'object-sync-for-salesforce' ),
							'id'   => 'wordpress_delete',
							'desc' => '',
						),
						$this->mappings->sync_sf_create => array(
							'text' => __( 'Salesforce create', 'object-sync-for-salesforce' ),
							'id'   => 'sf_create',
							'desc' => '',
						),
						$this->mappings->sync_sf_update => array(
							'text' => __( 'Salesforce update', 'object-sync-for-salesforce' ),
							'id'   => 'sf_update',
							'desc' => '',
						),
						$this->mappings->sync_sf_delete => array(
							'text' => __( 'Salesforce delete', 'object-sync-for-salesforce' ),
							'id'   => 'sf_delete',
							'desc' => '',
						),
					),
				),
			),
		);
		foreach ( $log_settings as $key => $attributes ) {
			$id       = $this->option_prefix . $key;
			$name     = $this->option_prefix . $key;
			$title    = $attributes['title'];
			$callback = $attributes['callback'];
			$page     = $attributes['page'];
			$section  = $attributes['section'];
			$args     = array_merge(
				$attributes['args'],
				array(
					'title'     => $title,
					'id'        => $id,
					'label_for' => $id,
					'name'      => $name,
				)
			);
			add_settings_field( $id, $title, $callback, $page, $section, $args );
			register_setting( $page, $id );
		}
	}

	/**
	* Create the notices, settings, and conditions by which admin notices should appear
	*
	*/
	public function notices() {

		// before a notice is displayed, we should make sure we are on a page related to this plugin
		if ( ! isset( $_GET['page'] ) || 'object-sync-salesforce-admin' !== $_GET['page'] ) {
			return;
		}

		$get_data = filter_input_array( INPUT_GET, FILTER_SANITIZE_STRING );
		require_once plugin_dir_path( __FILE__ ) . '../classes/admin-notice.php';

		$notices = array(
			'permission'      => array(
				'condition'   => false === $this->check_wordpress_admin_permissions(),
				'message'     => __( "Your account does not have permission to edit the Salesforce REST API plugin's settings.", 'object-sync-for-salesforce' ),
				'type'        => 'error',
				'dismissible' => false,
			),
			'fieldmap'        => array(
				'condition'   => isset( $get_data['transient'] ),
				'message'     => __( 'Errors kept this fieldmap from being saved.', 'object-sync-for-salesforce' ),
				'type'        => 'error',
				'dismissible' => true,
			),
			'object_map'      => array(
				'condition'   => isset( $get_data['map_transient'] ),
				'message'     => __( 'Errors kept this object map from being saved.', 'object-sync-for-salesforce' ),
				'type'        => 'error',
				'dismissible' => true,
			),
			'data_saved'      => array(
				'condition'   => isset( $get_data['data_saved'] ) && 'true' === $get_data['data_saved'],
				'message'     => __( 'This data was successfully saved.', 'object-sync-for-salesforce' ),
				'type'        => 'success',
				'dismissible' => true,
			),
			'data_save_error' => array(
				'condition'   => isset( $get_data['data_saved'] ) && 'false' === $get_data['data_saved'],
				'message'     => __( 'This data was not successfully saved. Try again.', 'object-sync-for-salesforce' ),
				'type'        => 'error',
				'dismissible' => true,
			),
		);

		foreach ( $notices as $key => $value ) {

			$condition = $value['condition'];
			$message   = $value['message'];

			if ( isset( $value['dismissible'] ) ) {
				$dismissible = $value['dismissible'];
			} else {
				$dismissible = false;
			}

			if ( isset( $value['type'] ) ) {
				$type = $value['type'];
			} else {
				$type = '';
			}

			if ( ! isset( $value['template'] ) ) {
				$template = '';
			}

			if ( $condition ) {
				new Object_Sync_Sf_Admin_Notice( $condition, $message, $dismissible, $type, $template );
			}
		}

	}

	/**
	* Get all the Salesforce object settings for fieldmapping
	* This takes either the $_POST array via ajax, or can be directly called with a $data array
	*
	* @param array $data
	* data must contain a salesforce_object
	* can optionally contain a type
	* @return array $object_settings
	*/
	public function get_salesforce_object_description( $data = array() ) {
		$ajax = false;
		if ( empty( $data ) ) {
			$data = filter_input_array( INPUT_POST, FILTER_SANITIZE_STRING );
			$ajax = true;
		}

		$object_description = array();

		if ( ! empty( $data['salesforce_object'] ) ) {
			$object = $this->salesforce['sfapi']->object_describe( esc_attr( $data['salesforce_object'] ) );

			$object_fields        = array();
			$include_record_types = array();

			// these can come from ajax
			$include = isset( $data['include'] ) ? (array) $data['include'] : array();
			$include = array_map( 'esc_attr', $include );

			if ( in_array( 'fields', $include, true ) || empty( $include ) ) {
				$type = isset( $data['field_type'] ) ? esc_attr( $data['field_type'] ) : ''; // can come from ajax
				foreach ( $object['data']['fields'] as $key => $value ) {
					if ( '' === $type || $type === $value['type'] ) {
						$object_fields[ $key ] = $value;
					}
				}
				$object_description['fields'] = $object_fields;
			}

			if ( in_array( 'recordTypeInfos', $include, true ) ) {
				if ( isset( $object['data']['recordTypeInfos'] ) && count( $object['data']['recordTypeInfos'] ) > 1 ) {
					foreach ( $object['data']['recordTypeInfos'] as $type ) {
						$object_record_types[ $type['recordTypeId'] ] = $type['name'];
					}
					$object_description['recordTypeInfos'] = $object_record_types;
				}
			}
		}

		if ( true === $ajax ) {
			wp_send_json_success( $object_description );
		} else {
			return $object_description;
		}
	}

	/**
	* Get Salesforce object fields for fieldmapping
	*
	* @param array $data
	* data must contain a salesforce_object
	* can optionally contain a type for the field
	* @return array $object_fields
	*/
	public function get_salesforce_object_fields( $data = array() ) {

		if ( ! empty( $data['salesforce_object'] ) ) {
			$object               = $this->salesforce['sfapi']->object_describe( esc_attr( $data['salesforce_object'] ) );
			$object_fields        = array();
			$type                 = isset( $data['type'] ) ? esc_attr( $data['type'] ) : '';
			$include_record_types = isset( $data['include_record_types'] ) ? esc_attr( $data['include_record_types'] ) : false;
			foreach ( $object['data']['fields'] as $key => $value ) {
				if ( '' === $type || $type === $value['type'] ) {
					$object_fields[ $key ] = $value;
				}
			}
			if ( true === $include_record_types ) {
				$object_record_types = array();
				if ( isset( $object['data']['recordTypeInfos'] ) && count( $object['data']['recordTypeInfos'] ) > 1 ) {
					foreach ( $object['data']['recordTypeInfos'] as $type ) {
						$object_record_types[ $type['recordTypeId'] ] = $type['name'];
					}
				}
			}
		}

		return $object_fields;

	}

	/**
	* Get WordPress object fields for fieldmapping
	* This takes either the $_POST array via ajax, or can be directly called with a $wordpress_object field
	*
	* @param string $wordpress_object
	* @return array $object_fields
	*/
	public function get_wordpress_object_fields( $wordpress_object = '' ) {
		$ajax      = false;
		$post_data = filter_input_array( INPUT_POST, FILTER_SANITIZE_STRING );
		if ( empty( $wordpress_object ) ) {
			$wordpress_object = isset( $post_data['wordpress_object'] ) ? sanitize_text_field( wp_unslash( $post_data['wordpress_object'] ) ) : '';
			$ajax             = true;
		}

		$object_fields = $this->wordpress->get_wordpress_object_fields( $wordpress_object );

		if ( true === $ajax ) {
			wp_send_json_success( $object_fields );
		} else {
			return $object_fields;
		}
	}

	/**
	* Get WordPress and Salesforce object fields together for fieldmapping
	* This takes either the $_POST array via ajax, or can be directly called with $wordpress_object and $salesforce_object fields
	*
	* @param string $wordpress_object
	* @param string $salesforce_object
	* @return array $object_fields
	*/
	public function get_wp_sf_object_fields( $wordpress_object = '', $salesforce = '' ) {
		$post_data = filter_input_array( INPUT_POST, FILTER_SANITIZE_STRING );
		if ( empty( $wordpress_object ) ) {
			$wordpress_object = isset( $post_data['wordpress_object'] ) ? sanitize_text_field( wp_unslash( $post_data['wordpress_object'] ) ) : '';
		}
		if ( empty( $salesforce_object ) ) {
			$salesforce_object = isset( $post_data['salesforce_object'] ) ? sanitize_text_field( wp_unslash( $post_data['salesforce_object'] ) ) : '';
		}

		$object_fields['wordpress']  = $this->get_wordpress_object_fields( $wordpress_object );
		$object_fields['salesforce'] = $this->get_salesforce_object_fields(
			array(
				'salesforce_object' => $salesforce_object,
			)
		);

		if ( ! empty( $post_data ) ) {
			wp_send_json_success( $object_fields );
		} else {
			return $object_fields;
		}
	}

	/**
	* Manually push the WordPress object to Salesforce
	* This takes either the $_POST array via ajax, or can be directly called with $wordpress_object and $wordpress_id fields
	*
	* @param string $wordpress_object
	* @param int $wordpress_id
	*/
	public function push_to_salesforce( $wordpress_object = '', $wordpress_id = '' ) {
		$post_data = filter_input_array( INPUT_POST, FILTER_SANITIZE_STRING );
		if ( empty( $wordpress_object ) && empty( $wordpress_id ) ) {
			$wordpress_object = isset( $post_data['wordpress_object'] ) ? sanitize_text_field( wp_unslash( $post_data['wordpress_object'] ) ) : '';
			$wordpress_id     = isset( $post_data['wordpress_id'] ) ? absint( $post_data['wordpress_id'] ) : '';
		}
		$data   = $this->wordpress->get_wordpress_object_data( $wordpress_object, $wordpress_id );
		$result = $this->push->manual_object_update( $data, $wordpress_object );

		if ( ! empty( $post_data['wordpress_object'] ) && ! empty( $post_data['wordpress_id'] ) ) {
			wp_send_json_success( $result );
		} else {
			return $result;
		}

	}

	/**
	* Manually pull the Salesforce object into WordPress
	* This takes either the $_POST array via ajax, or can be directly called with $salesforce_id fields
	*
	* @param string $salesforce_id
	* @param string $wordpress_object
	*/
	public function pull_from_salesforce( $salesforce_id = '', $wordpress_object = '' ) {
		$post_data = filter_input_array( INPUT_POST, FILTER_SANITIZE_STRING );
		if ( empty( $wordpress_object ) && empty( $salesforce_id ) ) {
			$wordpress_object = isset( $post_data['wordpress_object'] ) ? sanitize_text_field( wp_unslash( $post_data['wordpress_object'] ) ) : '';
			$salesforce_id    = isset( $post_data['salesforce_id'] ) ? sanitize_text_field( wp_unslash( $post_data['salesforce_id'] ) ) : '';
		}
		$type   = $this->salesforce['sfapi']->get_sobject_type( $salesforce_id );
		$result = $this->pull->manual_pull( $type, $salesforce_id, $wordpress_object ); // we want the wp object to make sure we get the right fieldmap
		if ( ! empty( $post_data ) ) {
			wp_send_json_success( $result );
		} else {
			return $result;
		}
	}

	/**
	* Manually pull the Salesforce object into WordPress
	* This takes an id for a mapping object row
	*
	* @param int $mapping_id
	*/
	public function refresh_mapped_data( $mapping_id = '' ) {
		$post_data = filter_input_array( INPUT_POST, FILTER_SANITIZE_STRING );
		if ( empty( $mapping_id ) ) {
			$mapping_id = isset( $post_data['mapping_id'] ) ? absint( $post_data['mapping_id'] ) : '';
		}
		$result = $this->mappings->get_object_maps(
			array(
				'id' => $mapping_id,
			)
		);
		if ( ! empty( $post_data ) ) {
			wp_send_json_success( $result );
		} else {
			return $result;
		}
	}

	/**
	* Prepare fieldmap data and redirect after processing
	* This runs when the create or update forms are submitted
	* It is public because it depends on an admin hook
	* It then calls the Object_Sync_Sf_Mapping class and sends prepared data over to it, then redirects to the correct page
	* This method does include error handling, by loading the submission in a transient if there is an error, and then deleting it upon success
	*
	*/
	public function prepare_fieldmap_data() {
		$error     = false;
		$post_data = filter_input_array( INPUT_POST, FILTER_SANITIZE_STRING );
		$cachekey  = md5( wp_json_encode( $post_data ) );

		if ( ! isset( $post_data['label'] ) || ! isset( $post_data['salesforce_object'] ) || ! isset( $post_data['wordpress_object'] ) ) {
			$error = true;
		}
		if ( true === $error ) {
			$this->sfwp_transients->set( $cachekey, $post_data, $this->wordpress->options['cache_expiration'] );
			if ( '' !== $cachekey ) {
				$url = esc_url_raw( $post_data['redirect_url_error'] ) . '&transient=' . $cachekey;
			}
		} else { // there are no errors
			// send the row to the fieldmap class
			// if it is add or clone, use the create method
			$method            = esc_attr( $post_data['method'] );
			$salesforce_fields = $this->get_salesforce_object_fields(
				array(
					'salesforce_object' => $post_data['salesforce_object'],
				)
			);
			$wordpress_fields  = $this->get_wordpress_object_fields( $post_data['wordpress_object'] );
			if ( 'add' === $method || 'clone' === $method ) {
				$result = $this->mappings->create_fieldmap( $post_data, $wordpress_fields, $salesforce_fields );
			} elseif ( 'edit' === $method ) { // if it is edit, use the update method
				$id     = esc_attr( $post_data['id'] );
				$result = $this->mappings->update_fieldmap( $post_data, $wordpress_fields, $salesforce_fields, $id );
			}
			if ( false === $result ) { // if the database didn't save, it's still an error
				$this->sfwp_transients->set( $cachekey, $post_data, $this->wordpress->options['cache_expiration'] );
				if ( '' !== $cachekey ) {
					$url = esc_url_raw( $post_data['redirect_url_error'] ) . '&transient=' . $cachekey;
				}
			} else {
				if ( isset( $post_data['transient'] ) ) { // there was previously an error saved. can delete it now.
					$this->sfwp_transients->delete( esc_attr( $post_data['map_transient'] ) );
				}
				// then send the user to the list of fieldmaps
				$url = esc_url_raw( $post_data['redirect_url_success'] );
			}
		}
		wp_safe_redirect( $url );
		exit();
	}

	/**
	* Delete fieldmap data and redirect after processing
	* This runs when the delete link is clicked, after the user confirms
	* It is public because it depends on an admin hook
	* It then calls the Object_Sync_Sf_Mapping class and the delete method
	*
	*/
	public function delete_fieldmap() {
		$post_data = filter_input_array( INPUT_POST, FILTER_SANITIZE_STRING );
		if ( $post_data['id'] ) {
			$result = $this->mappings->delete_fieldmap( $post_data['id'] );
			if ( true === $result ) {
				$url = esc_url_raw( $post_data['redirect_url_success'] );
			} else {
				$url = esc_url_raw( $post_data['redirect_url_error'] . '&id=' . $post_data['id'] );
			}
			wp_safe_redirect( $url );
			exit();
		}
	}

	/**
	* Prepare object data and redirect after processing
	* This runs when the update form is submitted
	* It is public because it depends on an admin hook
	* It then calls the Object_Sync_Sf_Mapping class and sends prepared data over to it, then redirects to the correct page
	* This method does include error handling, by loading the submission in a transient if there is an error, and then deleting it upon success
	*
	*/
	public function prepare_object_map_data() {
		$error     = false;
		$post_data = filter_input_array( INPUT_POST, FILTER_SANITIZE_STRING );
		$cachekey  = md5( wp_json_encode( $post_data ) );

		if ( ! isset( $post_data['wordpress_id'] ) || ! isset( $post_data['salesforce_id'] ) ) {
			$error = true;
		}
		if ( true === $error ) {
			$this->sfwp_transients->set( $cachekey, $post_data, $this->wordpress->options['cache_expiration'] );
			if ( '' !== $cachekey ) {
				$url = esc_url_raw( $post_data['redirect_url_error'] ) . '&map_transient=' . $cachekey;
			}
		} else { // there are no errors
			// send the row to the object map class
			$method = esc_attr( $post_data['method'] );
			if ( 'edit' === $method ) { // if it is edit, use the update method
				$id     = esc_attr( $post_data['id'] );
				$result = $this->mappings->update_object_map( $post_data, $id );
			}
			if ( false === $result ) { // if the database didn't save, it's still an error
				$this->sfwp_transients->set( $cachekey, $post_data, $this->wordpress->options['cache_expiration'] );
				if ( '' !== $cachekey ) {
					$url = esc_url_raw( $post_data['redirect_url_error'] ) . '&map_transient=' . $cachekey;
				}
			} else {
				if ( isset( $post_data['map_transient'] ) ) { // there was previously an error saved. can delete it now.
					$this->sfwp_transients->delete( esc_attr( $post_data['map_transient'] ) );
				}
				// then send the user to the success redirect url
				$url = esc_url_raw( $post_data['redirect_url_success'] );
			}
		}
		wp_safe_redirect( $url );
		exit();
	}

	/**
	* Delete object map data and redirect after processing
	* This runs when the delete link is clicked on an error row, after the user confirms
	* It is public because it depends on an admin hook
	* It then calls the Object_Sync_Sf_Mapping class and the delete method
	*
	*/
	public function delete_object_map() {
		$post_data = filter_input_array( INPUT_POST, FILTER_SANITIZE_STRING );
		if ( $post_data['id'] ) {
			$result = $this->mappings->delete_object_map( $post_data['id'] );
			if ( true === $result ) {
				$url = esc_url_raw( $post_data['redirect_url_success'] );
			} else {
				$url = esc_url_raw( $post_data['redirect_url_error'] . '&id=' . $post_data['id'] );
			}
			wp_safe_redirect( $url );
			exit();
		}
	}

	/**
	* Import a json file and use it for plugin data
	*
	*/
	public function import_json_file() {

		if ( ! wp_verify_nonce( $_POST['object_sync_for_salesforce_nonce_import'], 'object_sync_for_salesforce_nonce_import' ) ) {
			return;
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$path      = $_FILES['import_file']['name'];
		$extension = pathinfo( $path, PATHINFO_EXTENSION );
		if ( 'json' !== $extension ) {
			wp_die( __( 'Please upload a valid .json file' ) );
		}

		$import_file = $_FILES['import_file']['tmp_name'];
		if ( empty( $import_file ) ) {
			wp_die( __( 'Please upload a file to import' ) );
		}

		// Retrieve the data from the file and convert the json object to an array.
		$data = (array) json_decode( file_get_contents( $import_file ), true );

		// if there is only one object map, fix the array
		if ( isset( $data['object_maps'] ) ) {
			if ( count( $data['object_maps'] ) === count( $data['object_maps'], COUNT_RECURSIVE ) ) {
				$data['object_maps'] = array( 0 => $data['object_maps'] );
			}
		}

		$overwrite = isset( $_POST['overwrite'] ) ? esc_attr( $_POST['overwrite'] ) : '';
		if ( '1' === $overwrite ) {
			if ( isset( $data['fieldmaps'] ) ) {
				$fieldmaps = $this->mappings->get_fieldmaps();
				foreach ( $fieldmaps as $fieldmap ) {
					$id     = $fieldmap['id'];
					$delete = $this->mappings->delete_fieldmap( $id );
				}
			}
			if ( isset( $data['object_maps'] ) ) {
				$object_maps = $this->mappings->get_object_maps();

				// if there is only one existing object map, fix the array
				if ( count( $object_maps ) === count( $object_maps, COUNT_RECURSIVE ) ) {
					$object_maps = array( 0 => $object_maps );
				}

				foreach ( $object_maps as $object_map ) {
					$id     = $object_map['id'];
					$delete = $this->mappings->delete_object_map( $id );
				}
			}
			if ( isset( $data['plugin_settings'] ) ) {
				foreach ( $data['plugin_settings'] as $key => $value ) {
					delete_option( $value['option_name'] );
				}
			}
		}

		$success = true;

		if ( isset( $data['fieldmaps'] ) ) {
			foreach ( $data['fieldmaps'] as $fieldmap ) {
				unset( $fieldmap['id'] );
				$create = $this->mappings->create_fieldmap( $fieldmap );
				if ( false === $create ) {
					$success = false;
				}
			}
		}

		if ( isset( $data['object_maps'] ) ) {
			foreach ( $data['object_maps'] as $object_map ) {
				unset( $object_map['id'] );
				$create = $this->mappings->create_object_map( $object_map );
				if ( false === $create ) {
					$success = false;
				}
			}
		}

		if ( isset( $data['plugin_settings'] ) ) {
			foreach ( $data['plugin_settings'] as $key => $value ) {
				update_option( $value['option_name'], maybe_unserialize( $value['option_value'] ), $value['autoload'] );
			}
		}

		if ( true === $success ) {
			wp_safe_redirect( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=import-export&data_saved=true' ) );
			exit;
		} else {
			wp_safe_redirect( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=import-export&data_saved=false' ) );
			exit;
		}

	}

	/**
	* Create a json file for exporting
	*
	*/
	public function export_json_file() {

		if ( ! wp_verify_nonce( $_POST['object_sync_for_salesforce_nonce_export'], 'object_sync_for_salesforce_nonce_export' ) ) {
			return;
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$post_data = filter_input_array( INPUT_POST, FILTER_SANITIZE_STRING );
		$export    = array();
		if ( in_array( 'fieldmaps', $post_data['export'] ) ) {
			$export['fieldmaps'] = $this->mappings->get_fieldmaps();
		}
		if ( in_array( 'object_maps', $post_data['export'] ) ) {
			$export['object_maps'] = $this->mappings->get_object_maps();
		}
		if ( in_array( 'plugin_settings', $post_data['export'] ) ) {
			$export['plugin_settings'] = $this->wpdb->get_results( 'SELECT * FROM ' . $this->wpdb->prefix . 'options' . ' WHERE option_name like "' . $this->option_prefix . '%"', ARRAY_A );
		}
		nocache_headers();
		header( 'Content-Type: application/json; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename=object-sync-for-salesforce-data-export-' . date( 'm-d-Y' ) . '.json' );
		header( 'Expires: 0' );
		echo wp_json_encode( $export );
		exit;
	}

	/**
	* Default display for <input> fields
	*
	* @param array $args
	*/
	public function display_input_field( $args ) {
		$type    = $args['type'];
		$id      = $args['label_for'];
		$name    = $args['name'];
		$desc    = $args['desc'];
		$checked = '';

		$class = 'regular-text';

		if ( 'checkbox' === $type ) {
			$class = 'checkbox';
		}

		if ( ! isset( $args['constant'] ) || ! defined( $args['constant'] ) ) {
			$value = esc_attr( get_option( $id, '' ) );
			if ( 'checkbox' === $type ) {
				if ( '1' === $value ) {
					$checked = 'checked ';
				}
				$value = 1;
			}
			if ( '' === $value && isset( $args['default'] ) && '' !== $args['default'] ) {
				$value = $args['default'];
			}

			echo sprintf( '<input type="%1$s" value="%2$s" name="%3$s" id="%4$s" class="%5$s"%6$s>',
				esc_attr( $type ),
				esc_attr( $value ),
				esc_attr( $name ),
				esc_attr( $id ),
				sanitize_html_class( $class . esc_html( ' code' ) ),
				esc_html( $checked )
			);
			if ( '' !== $desc ) {
				echo sprintf( '<p class="description">%1$s</p>',
					esc_html( $desc )
				);
			}
		} else {
			echo sprintf( '<p><code>%1$s</code></p>',
				esc_html__( 'Defined in wp-config.php', 'object-sync-for-salesforce' )
			);
		}
	}

	/**
	* Display for multiple checkboxes
	* Above method can handle a single checkbox as it is
	*
	* @param array $args
	*/
	public function display_checkboxes( $args ) {
		$type    = 'checkbox';
		$name    = $args['name'];
		$options = get_option( $name, array() );
		foreach ( $args['items'] as $key => $value ) {
			$text    = $value['text'];
			$id      = $value['id'];
			$desc    = $value['desc'];
			$checked = '';
			if ( is_array( $options ) && in_array( (string) $key, $options, true ) ) {
				$checked = 'checked';
			} elseif ( is_array( $options ) && empty( $options ) ) {
				if ( isset( $value['default'] ) && true === $value['default'] ) {
					$checked = 'checked';
				}
			}
			echo sprintf( '<div class="checkbox"><label><input type="%1$s" value="%2$s" name="%3$s[]" id="%4$s"%5$s>%6$s</label></div>',
				esc_attr( $type ),
				esc_attr( $key ),
				esc_attr( $name ),
				esc_attr( $id ),
				esc_html( $checked ),
				esc_html( $text )
			);
			if ( '' !== $desc ) {
				echo sprintf( '<p class="description">%1$s</p>',
					esc_html( $desc )
				);
			}
		}
	}

	/**
	* Display for a dropdown
	*
	* @param array $args
	*/
	public function display_select( $args ) {
		$type = $args['type'];
		$id   = $args['label_for'];
		$name = $args['name'];
		$desc = $args['desc'];
		if ( ! isset( $args['constant'] ) || ! defined( $args['constant'] ) ) {
			$current_value = get_option( $name );

			echo sprintf( '<div class="select"><select id="%1$s" name="%2$s"><option value="">- ' . __( 'Select one', 'object-sync-for-salesforce' ) . ' -</option>',
				esc_attr( $id ),
				esc_attr( $name )
			);

			foreach ( $args['items'] as $key => $value ) {
				$text     = $value['text'];
				$value    = $value['value'];
				$selected = '';
				if ( $key === $current_value || $value === $current_value ) {
					$selected = ' selected';
				}

				echo sprintf( '<option value="%1$s"%2$s>%3$s</option>',
					esc_attr( $value ),
					esc_attr( $selected ),
					esc_html( $text )
				);

			}
			echo '</select>';
			if ( '' !== $desc ) {
				echo sprintf( '<p class="description">%1$s</p>',
					esc_html( $desc )
				);
			}
			echo '</div>';
		} else {
			echo sprintf( '<p><code>%1$s</code></p>',
				esc_html__( 'Defined in wp-config.php', 'object-sync-for-salesforce' )
			);
		}
	}

	/**
	* Dropdown formatted list of Salesforce API versions
	*
	* @return array $args
	*/
	private function version_options() {
		$versions = $this->salesforce['sfapi']->get_api_versions();
		$args     = array();
		foreach ( $versions['data'] as $key => $value ) {
			$args[] = array(
				'value' => $value['version'],
				'text'  => $value['label'] . ' (' . $value['version'] . ')',
			);
		}
		return $args;
	}

	/**
	* Default display for <a href> links
	*
	* @param array $args
	*/
	public function display_link( $args ) {
		$label = $args['label'];
		$desc  = $args['desc'];
		$url   = $args['url'];
		if ( isset( $args['link_class'] ) ) {
			echo sprintf( '<p><a class="%1$s" href="%2$s">%3$s</a></p>',
				esc_attr( $args['link_class'] ),
				esc_url( $url ),
				esc_html( $label )
			);
		} else {
			echo sprintf( '<p><a href="%1$s">%2$s</a></p>',
				esc_url( $url ),
				esc_html( $label )
			);
		}

		if ( '' !== $desc ) {
			echo sprintf( '<p class="description">%1$s</p>',
				esc_html( $desc )
			);
		}

	}

	/**
	* Allow for a standard sanitize/validate method. We could use more specific ones if need be, but this one provides a baseline.
	*
	* @param string $option
	* @return string $option
	*/
	public function sanitize_validate_text( $option ) {
		if ( is_array( $option ) ) {
			$options = array();
			foreach ( $option as $key => $value ) {
				$options[ $key ] = sanitize_text_field( $value );
			}
			return $options;
		}
		$option = sanitize_text_field( $option );
		return $option;
	}

	/**
	* Run a demo of Salesforce API call on the authenticate tab after WordPress has authenticated with it
	*
	* @param object $sfapi
	*/
	private function status( $sfapi ) {

		$versions = $sfapi->get_api_versions();

		// format this array into text so users can see the versions
		if ( true === $versions['cached'] ) {
			$versions_is_cached = esc_html__( 'This list is cached, and', 'object-sync-salesforce' );
		} else {
			$versions_is_cached = esc_html__( 'This list is not cached, but', 'object-sync-salesforce' );
		}

		if ( true === $versions['from_cache'] ) {
			$versions_from_cache = esc_html__( 'items were loaded from the cache', 'object-sync-salesforce' );
		} else {
			$versions_from_cache = esc_html__( 'items were not loaded from the cache', 'object-sync-salesforce' );
		}

		// translators: 1) $versions_is_cached is the "This list is/is not cached, and/but" line, 2) $versions_from_cache is the "items were/were not loaded from the cache" line
		$versions_apicall_summary = sprintf( esc_html__( 'Available Salesforce API versions. %1$s %2$s. This is not an authenticated request, so it does not touch the Salesforce token.', 'object-sync-for-salesforce' ),
			$versions_is_cached,
			$versions_from_cache
		);

		$contacts = $sfapi->query( 'SELECT Name, Id from Contact LIMIT 100' );

		// format this array into html so users can see the contacts
		if ( true === $contacts['cached'] ) {
			$contacts_is_cached = esc_html__( 'They are cached, and', 'object-sync-salesforce' );
		} else {
			$contacts_is_cached = esc_html__( 'They are not cached, but', 'object-sync-salesforce' );
		}

		if ( true === $contacts['from_cache'] ) {
			$contacts_from_cache = esc_html__( 'they were loaded from the cache', 'object-sync-salesforce' );
		} else {
			$contacts_from_cache = esc_html__( 'they were not loaded from the cache', 'object-sync-salesforce' );
		}

		if ( true === $contacts['is_redo'] ) {
			$contacts_refreshed_token = esc_html__( 'This request did require refreshing the Salesforce token', 'object-sync-salesforce' );
		} else {
			$contacts_refreshed_token = esc_html__( 'This request did not require refreshing the Salesforce token', 'object-sync-salesforce' );
		}

		// translators: 1) $contacts['data']['totalSize'] is the number of items loaded, 2) $contacts['data']['records'][0]['attributes']['type'] is the name of the Salesforce object, 3) $contacts_is_cached is the "They are/are not cached, and/but" line, 4) $contacts_from_cache is the "they were/were not loaded from the cache" line, 5) is the "this request did/did not require refreshing the Salesforce token" line
		$contacts_apicall_summary = sprintf( esc_html__( 'Salesforce successfully returned %1$s %2$s records. %3$s %4$s. %5$s.', 'object-sync-for-salesforce' ),
			absint( $contacts['data']['totalSize'] ),
			esc_html( $contacts['data']['records'][0]['attributes']['type'] ),
			$contacts_is_cached,
			$contacts_from_cache,
			$contacts_refreshed_token
		);

		require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/status.php' );

	}

	/**
	* Deauthorize WordPress from Salesforce.
	* This deletes the tokens from the database; it does not currently do anything in Salesforce
	* For this plugin at this time, that is the decision we are making: don't do any kind of authorization stuff inside Salesforce
	*/
	private function logout() {
		$this->access_token  = delete_option( $this->option_prefix . 'access_token' );
		$this->instance_url  = delete_option( $this->option_prefix . 'instance_url' );
		$this->refresh_token = delete_option( $this->option_prefix . 'refresh_token' );
		echo sprintf( '<p>You have been logged out. You can use the <a href="%1$s">%2$s</a> tab to log in again.</p>',
			esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=authorize' ) ),
			esc_html__( 'Authorize', 'object-sync-for-salesforce' )
		);
	}

	/**
	* Ajax call to clear the plugin cache.
	*/
	public function clear_sfwp_cache() {
		$result   = $this->clear_cache( true );
		$response = array(
			'message' => $result['message'],
			'success' => $result['success'],
		);
		wp_send_json_success( $response );
	}

	/**
	* Clear the plugin's cache.
	* This uses the flush method contained in the WordPress cache to clear all of this plugin's cached data.
	*/
	private function clear_cache( $ajax = false ) {
		$result = (bool) $this->wordpress->sfwp_transients->flush();
		if ( true === $result ) {
			$message = __( 'The plugin cache has been cleared.', 'object-sync-for-salesforce' );
		} else {
			$message = __( 'There was an error clearing the plugin cache. Try refreshing this page.', 'object-sync-for-salesforce' );
		}
		if ( false === $ajax ) {
			// translators: parameter 1 is the result message
			echo sprintf( '<p>%1$s</p>', $message );
		} else {
			return array(
				'message' => $message,
				'success' => $result,
			);
		}
	}

	/**
	* Check WordPress Admin permissions
	* Check if the current user is allowed to access the Salesforce plugin options
	*/
	private function check_wordpress_admin_permissions() {

		// one programmatic way to give this capability to additional user roles is the
		// object_sync_for_salesforce_roles_configure_salesforce hook
		// it runs on activation of this plugin, and will assign the below capability to any role
		// coming from the hook

		// alternatively, other roles can get this capability in whatever other way you like
		// point is: to administer this plugin, you need this capability

		if ( ! current_user_can( 'configure_salesforce' ) ) {
			return false;
		} else {
			return true;
		}

	}

	/**
	* Show what we know about this user's relationship to a Salesforce object, if any
	* @param object $user
	*
	*/
	public function show_salesforce_user_fields( $user ) {
		$get_data = filter_input_array( INPUT_GET, FILTER_SANITIZE_STRING );
		if ( true === $this->check_wordpress_admin_permissions() ) {
			$mapping  = $this->mappings->load_by_wordpress( 'user', $user->ID );
			$fieldmap = $this->mappings->get_fieldmaps(
				null, // id field must be null for multiples
				array(
					'wordpress_object' => 'user',
				)
			);
			if ( isset( $mapping['id'] ) && ! isset( $get_data['edit_salesforce_mapping'] ) ) {
				require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/user-profile-salesforce.php' );
			} elseif ( ! empty( $fieldmap ) ) { // is the user mapped to something already?
				if ( isset( $get_data['edit_salesforce_mapping'] ) && 'true' === sanitize_key( $get_data['edit_salesforce_mapping'] ) ) {
					require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/user-profile-salesforce-change.php' );
				} else {
					require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/user-profile-salesforce-map.php' );
				}
			}
		}
	}

	/**
	* If the user profile has been mapped to Salesforce, do it
	* @param int $user_id
	*
	*/
	public function save_salesforce_user_fields( $user_id ) {
		$post_data = filter_input_array( INPUT_POST, FILTER_SANITIZE_STRING );
		if ( isset( $post_data['salesforce_update_mapped_user'] ) && '1' === rawurlencode( $post_data['salesforce_update_mapped_user'] ) ) {
			$mapping_object                  = $this->mappings->get_object_maps(
				array(
					'wordpress_id'     => $user_id,
					'wordpress_object' => 'user',
				)
			);
			$mapping_object['salesforce_id'] = $post_data['salesforce_id'];

			$result = $this->mappings->update_object_map( $mapping_object, $mapping_object['id'] );
		} elseif ( isset( $post_data['salesforce_create_mapped_user'] ) && '1' === rawurlencode( $post_data['salesforce_create_mapped_user'] ) ) {
			// if a Salesforce ID was entered
			if ( isset( $post_data['salesforce_id'] ) && ! empty( $post_data['salesforce_id'] ) ) {
				$mapping_object = $this->create_object_map( $user_id, 'user', $post_data['salesforce_id'] );
			} elseif ( isset( $post_data['push_new_user_to_salesforce'] ) ) {
				// otherwise, create a new record in Salesforce
				$result = $this->push_to_salesforce( 'user', $user_id );
			}
		}
	}

	/**
	* Render tabs for settings pages in admin
	* @param array $tabs
	* @param string $tab
	*/
	private function tabs( $tabs, $tab = '' ) {

		$get_data        = filter_input_array( INPUT_GET, FILTER_SANITIZE_STRING );
		$consumer_key    = $this->login_credentials['consumer_key'];
		$consumer_secret = $this->login_credentials['consumer_secret'];
		$callback_url    = $this->login_credentials['callback_url'];

		$current_tab = $tab;
		echo '<h2 class="nav-tab-wrapper">';
		foreach ( $tabs as $tab_key => $tab_caption ) {
			$active = $current_tab === $tab_key ? ' nav-tab-active' : '';
			if ( 'settings' === $tab_key || ( isset( $consumer_key ) && isset( $consumer_secret ) && ! empty( $consumer_key ) && ! empty( $consumer_secret ) ) ) {
				echo sprintf( '<a class="nav-tab%1$s" href="%2$s">%3$s</a>',
					esc_attr( $active ),
					esc_url( '?page=object-sync-salesforce-admin&tab=' . $tab_key ),
					esc_html( $tab_caption )
				);
			}
		}
		echo '</h2>';

		if ( isset( $get_data['tab'] ) ) {
			$tab = sanitize_key( $get_data['tab'] );
		} else {
			$tab = '';
		}
	}

	/**
	* Clear schedule
	* This clears the schedule if the user clicks the button
	*/
	private function clear_schedule( $schedule_name = '' ) {
		if ( '' !== $schedule_name ) {
			$schedule = $this->schedule( $schedule_name );
			$schedule->cancel_by_name( $schedule_name );
			// translators: $schedule_name is the name of the current queue. Defaults: salesforce_pull, salesforce_push, salesforce
			echo sprintf( esc_html__( 'You have cleared the %s schedule.', 'object-sync-for-salesforce' ), esc_html( $schedule_name ) );
		} else {
			echo esc_html__( 'You need to specify the name of the schedule you want to clear.', 'object-sync-for-salesforce' );
		}
	}

	private function get_schedule_count( $schedule_name = '' ) {
		if ( '' !== $schedule_name ) {
			$schedule = $this->schedule( $schedule_name );
			return $this->schedule->count_queue_items( $schedule_name );
		} else {
			return 'unknown';
		}
	}

	/**
	* Load the schedule class
	*/
	private function schedule( $schedule_name ) {
		if ( ! class_exists( 'Object_Sync_Sf_Schedule' ) && file_exists( plugin_dir_path( __FILE__ ) . '../vendor/autoload.php' ) ) {
			require_once plugin_dir_path( __FILE__ ) . '../vendor/autoload.php';
			require_once plugin_dir_path( __FILE__ ) . '../classes/schedule.php';
		}
		$schedule       = new Object_Sync_Sf_Schedule( $this->wpdb, $this->version, $this->login_credentials, $this->slug, $this->wordpress, $this->salesforce, $this->mappings, $schedule_name, $this->logging, $this->schedulable_classes );
		$this->schedule = $schedule;
		return $schedule;
	}

	/**
	* Create an object map between a WordPress object and a Salesforce object
	*
	* @param int $wordpress_id
	*   Unique identifier for the WordPress object
	* @param string $wordpress_object
	*   What kind of object is it?
	* @param string $salesforce_id
	*   Unique identifier for the Salesforce object
	* @param string $action
	*   Did we push or pull?
	*
	* @return int $wpdb->insert_id
	*   This is the database row for the map object
	*
	*/
	private function create_object_map( $wordpress_id, $wordpress_object, $salesforce_id, $action = '' ) {
		// Create object map and save it
		$mapping_object = $this->mappings->create_object_map(
			array(
				'wordpress_id'      => $wordpress_id, // wordpress unique id
				'salesforce_id'     => $salesforce_id, // salesforce unique id. we don't care what kind of object it is at this point
				'wordpress_object'  => $wordpress_object, // keep track of what kind of wp object this is
				'last_sync'         => current_time( 'mysql' ),
				'last_sync_action'  => $action,
				'last_sync_status'  => $this->mappings->status_success,
				'last_sync_message' => __( 'Mapping object updated via function: ', 'object-sync-for-salesforce' ) . __FUNCTION__,
			)
		);

		return $mapping_object;

	}

}
