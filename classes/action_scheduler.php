<?php
/**
 * Class file for the Object_Sync_Sf_Schedule class. Extend the WP_Background_Process class for the purposes of Object Sync for Salesforce.
 *
 * @file
 */

if ( ! class_exists( 'Object_Sync_Salesforce' ) ) {
	die();
}

/**
 * Schedule events in a queue in WordPress
 */
class Object_Sync_Sf_Action_Scheduler {

	public function __construct() {
		require_once( plugin_dir_path( __FILE__ ) . '../vendor/prospress/action-scheduler/action-scheduler.php' );
		add_action( 'init', array( $this, 'add_actions' ) );
	}

	public function add_actions() {
		//as_schedule_recurring_action( $timestamp, $interval_in_seconds, $hook, $args, $group );
	}

	public function get_frequency( $name, $unit ) {
		$schedule_number = get_option( 'object_sync_for_salesforce_' . $name . '_schedule_number', '' );
		$schedule_unit   = get_option( 'object_sync_for_salesforce_' . $name . '_schedule_unit', '' );

		switch ( $schedule_unit ) {
			case 'minutes':
				$seconds = 60;
				$minutes = 1;
				break;
			case 'hours':
				$seconds = 3600;
				$minutes = 60;
				break;
			case 'days':
				$seconds = 86400;
				$minutes = 1440;
				break;
			default:
				$seconds = 0;
				$minutes = 0;
		}

		$total = ${$unit} * $schedule_number;

		return $total;
	}

	public function save_to_queue( $data, $action_args ) {

	}

}
