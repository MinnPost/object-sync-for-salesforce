<?php

class Wordpress_Salesforce_Schedule extends WP_Background_Process {

	protected $wpdb;
    protected $version;
    protected $login_credentials;
    protected $text_domain;
    protected $wordpress;
    protected $salesforce;
    protected $mappings;
    protected $schedule_name;
    protected $logging;


	/**
    * Functionality for syncing WordPress objects with Salesforce
    * todo: figure out if we need to bring in all these parameters or if there's a better way
    *
    * @param object $wpdb
    * @param string $version
    * @param array $login_credentials
    * @param string $text_domain
    * @param object $wordpress
    * @param object $salesforce
    * @param object $mappings
    * @param string $schedule_name
    * @throws \Exception
    */

    public function __construct( $wpdb, $version, $login_credentials, $text_domain, $wordpress, $salesforce, $mappings, $schedule_name, $logging ) {
        
        $this->wpdb = &$wpdb;
        $this->version = $version;
        $this->login_credentials = $login_credentials;
        $this->text_domain = $text_domain; 
        $this->wordpress = $wordpress;
        $this->salesforce = $salesforce;
        $this->mappings = $mappings;
        $this->schedule_name = $schedule_name;
        $this->logging = $logging;

        $this->add_filters();

        $this->schedule(); // currently this creates a scheduled event for $this->schedule_name

//        $this->frequency = $frequency;

    }

    /**
    * Create the filters we need to run
    *
    */
    public function add_filters() {
		add_filter( 'cron_schedules', array( &$this, 'add_scheduled_interval' ) );
    }

    /**
     * Add additional intervals to wp schedules
     * This adds as many intervals as we want to the array of schedules
     * todo: make this configurable
     *
     * @return array $schedules
     */
	public function add_scheduled_interval( $schedules ) {
		$schedules['minutes_5'] = array(
			'interval' => 300,
			'display' => 'Every 5 minutes'
		);
		$schedules['minutes_10'] = array(
			'interval' => 300,
			'display' => 'Every 10 minutes'
		);
		$schedules['minutes_15'] = array(
			'interval' => 300,
			'display' => 'Every 15 minutes'
		);
		$schedules['minutes_30'] = array(
			'interval' => 300,
			'display' => 'Every 30 minutes'
		);
		$schedules['minutes_45'] = array(
			'interval' => 300,
			'display' => 'Every 45 minutes'
		);
		$schedules['hours_3'] = array(
			'interval' => 300,
			'display' => 'Every 3 hours'
		);
		return $schedules;
	}

    // todo: we should trigger a simple salesforce api call in here, or somewhere, so the oauth token never expires.


	/**
	* Get a schedule name
	*
	* @param string $key
	*
	* todo: want to be able to run multiple queues at once, but currently this is not the case
	*
	* @return array
	*/
    public function get_schedule( $key = 'default' ) {
    	return $this->schedules[$key];
    }


    /**
     * Schedule function
     * This creates and manages the scheduling of the task
     * todo: make the timing configurable in the admin.
     *
     * @return void
     */
    public function schedule() {
	    if (! wp_next_scheduled ( $this->schedule_name ) ) {
			wp_schedule_event( time(), 'minutes_5', $this->schedule_name );
	    }
	    add_action( $this->schedule_name, array( $this, 'call_handler' ) ); // run the handle method 
    }

	/**
	 * Task
	 *
	 * Override this method to perform any actions required on the
	 * queue data. Return the modified data for further processing
	 * in the next pass through. Or, return false to remove the
	 * data from the queue.
	 *
	 * todo: figure out if this is really the best way to call the salesforce methods
	 *
	 * @param mixed $data Queue data to iterate over
	 *
	 * @return mixed
	 */
	protected function task( $data ) {
		if ( isset( $data['class'] ) ) {
			$class = new $data['class']( $this->wpdb, $this->version, $this->login_credentials, $this->text_domain, $this->wordpress, $this->salesforce, $this->mappings, $this, $this->schedule_name, $this->logging );
			$method = $data['method'];
			$task = $class->$method( $data['object_type'], $data['object'], $data['mapping'], $data['sf_sync_trigger'] );
		}
		return false;
	}

	public function call_handler() {
		// call the handle method in the cron so we can run the queue periodically
		$handle = $this->handle();
	}

	/**
	 * Complete
	 *
	 * Override if applicable, but ensure that the below actions are
	 * performed, or, call parent::complete().
	 */
	protected function complete() {
		parent::complete();
		// we could log something here, or show something to admin user, etc.
	}

}