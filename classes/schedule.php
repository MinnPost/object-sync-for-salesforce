<?php

class Wordpress_Salesforce_Schedule extends WP_Background_Process {

	//protected $wpdb;
    protected $version;
    protected $login_credentials;
    protected $text_domain;
    protected $salesforce;
    protected $schedule_name;

//	use WP_Example_Logger;

	/**
	 * @var string
	 */
	protected $action = 'salesforce_process';

	/**
    * Functionality for pushing WordPress objects into Salesforce
    *
    * @param object $wpdb
    * @param string $version
    * @param array $login_credentials
    * @param string $text_domain
    * @param object $salesforce
    * @param string $schedule_name
    * @throws \Exception
    */
    public function __construct( $version, $login_credentials, $text_domain, $salesforce, $schedule_name ) {
        //$this->wpdb = &$wpdb;
        $this->version = $version;
        $this->login_credentials = $login_credentials;
        $this->text_domain = $text_domain; 
        $this->salesforce = $salesforce;
        $this->schedule_name = $schedule_name;
    }


    /**
     * Schedule function
     * This creates and manages the scheduling of the task
     * todo: make the timing configurable in the admin.
     * todo: figure out the deactivation as well 
     *
     * @return void
     */
    public function schedule() {
        if (! wp_next_scheduled ( $this->schedule_name ) ) {
			wp_schedule_event( time(), 'hourly', $this->schedule_name );
	    }
	    add_action( $this->schedule_name, array( $this, 'call_handler') ); // run the handle method 
    }

	/**
	 * Task
	 *
	 * Override this method to perform any actions required on each
	 * queue item. Return the modified item for further processing
	 * in the next pass through. Or, return false to remove the
	 * item from the queue.
	 *
	 * @param mixed $item Queue item to iterate over
	 *
	 * @return mixed
	 */
	protected function task( $item ) {
		//$message = $this->get_message( $item );

		//$this->really_long_running_task();
		//$this->log( $message );
		error_log('the handle method in the parent class calls this method. this is where we need to run the salesforce api calls');
		error_log(print_r($item, true));
		error_log('above is the item');
		//$this->salesforce->salesforce->object_upsert();

		


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

		// Show notice to user or perform some other arbitrary task...
	}


}