<?php
/**
 * Manage the task queue.
 *
 * @class   Object_Sync_Sf_Queue
 * @package Object_Sync_Salesforce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Object_Sync_Sf_Queue class.
 */
class Object_Sync_Sf_Queue {

	/**
	 * Current version of the plugin
	 *
	 * @var string
	 */
	public $version;

	/**
	 * The main plugin file
	 *
	 * @var string
	 */
	public $file;

	/**
	 * Global object of `$wpdb`, the WordPress database
	 *
	 * @var object
	 */
	public $wpdb;

	/**
	 * The plugin's slug so we can include it when necessary
	 *
	 * @var string
	 */
	public $slug;

	/**
	 * The plugin's prefix when saving options to the database
	 *
	 * @var string
	 */
	public $option_prefix;

	/**
	 * Array of what classes in the plugin can be scheduled to occur with `wp_cron` events
	 *
	 * @var array
	 */
	public $schedulable_classes;

	/**
	 * Constructor for queue class
	 */
	public function __construct() {
		$this->version       = object_sync_for_salesforce()->version;
		$this->file          = object_sync_for_salesforce()->file;
		$this->wpdb          = object_sync_for_salesforce()->wpdb;
		$this->slug          = object_sync_for_salesforce()->slug;
		$this->option_prefix = object_sync_for_salesforce()->option_prefix;

		$this->schedulable_classes = object_sync_for_salesforce()->schedulable_classes;

		$this->add_actions();
	}

	/**
	 * Add actions
	 */
	private function add_actions() {
		add_filter( 'action_scheduler_queue_runner_batch_size', array( $this, 'action_scheduler_batch_size' ) );
		add_filter( 'action_scheduler_queue_runner_concurrent_batches', array( $this, 'action_scheduler_concurrent_batches' ) );
	}

	/**
	 * Set the batch size.
	 *
	 * @param int $batch_size how big the batch is.
	 * @return int $batch_size
	 */
	public function action_scheduler_batch_size( $batch_size ) {
		// default for this library is 20 so that is where we start.
		$batch_size = filter_var( get_option( $this->option_prefix . 'action_scheduler_batch_size', 20 ), FILTER_VALIDATE_INT );
		return $batch_size;
	}

	/**
	 * Set the number of concurrent batches that can run.
	 *
	 * @param int $concurrent_batches how many batches can run at once.
	 * @return int $concurrent_batches
	 */
	public function action_scheduler_concurrent_batches( $concurrent_batches ) {
		// default for this library is 5 so that is where we start.
		$concurrent_batches = filter_var( get_option( $this->option_prefix . 'action_scheduler_concurrent_batches', 5 ), FILTER_VALIDATE_INT );
		return $concurrent_batches;
	}

	/**
	 * Get all the schedules with their frequencies, sorted
	 *
	 * @param string $unit The unit of time.
	 * @param string $sort Which direction to sort.
	 * @return array $this->schedulable_classes
	 */
	public function get_frequencies( $unit = 'seconds', $sort = 'asc' ) {

		foreach ( $this->schedulable_classes as $key => $schedule ) {
			$this->schedulable_classes[ $key ]['frequency'] = $this->get_frequency( $key, 'seconds' );
		}

		if ( 'asc' === $sort ) {
			uasort(
				$this->schedulable_classes,
				function ( $a, $b ) {
					// we want zero values at the top of an ascending sort.
					if ( 0 === $a['frequency'] ) {
						return 1;
					}
					if ( 0 === $b['frequency'] ) {
						return -1;
					}
					return $a['frequency'] - $b['frequency'];
				}
			);
		} else {
			uasort(
				$this->schedulable_classes,
				function ( $a, $b ) {
					return $b['frequency'] - $a['frequency'];
				}
			);
		}

		return $this->schedulable_classes;

	}

	/**
	 * Get a single schedule item's frequency
	 *
	 * @param string $name The name of the schedule.
	 * @param string $unit The unit of time.
	 * @return int How often it runs in that unit of time
	 */
	public function get_frequency( $name, $unit ) {
		$schedule_number = get_option( $this->option_prefix . $name . '_schedule_number', '' );
		$schedule_unit   = get_option( $this->option_prefix . $name . '_schedule_unit', '' );

		// make sure we have something saved in the options so it doesn't fail.
		if ( '' === $schedule_number ) {
			$schedule_number = 0;
		}

		if ( '' === $schedule_unit ) {
			$schedule_unit = 'minutes';
		}

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

		$schedule_number = filter_var( $schedule_number, FILTER_SANITIZE_NUMBER_INT );
		$total           = $$unit * $schedule_number;

		return $total;
	}

	/**
	 * Enqueue an action to run one time, as soon as possible
	 *
	 * @param string $hook The hook to trigger.
	 * @param array  $args Arguments to pass when the hook triggers.
	 * @param string $group The group to assign this job to.
	 * @return string The action ID.
	 */
	public function add( $hook, $args = array(), $group = '' ) {
		return $this->schedule_single( time(), $hook, $args, $group );
	}

	/**
	 * Schedule an action to run once at some time in the future
	 *
	 * @param int    $timestamp When the job will run.
	 * @param string $hook The hook to trigger.
	 * @param array  $args Arguments to pass when the hook triggers.
	 * @param string $group The group to assign this job to.
	 * @return string The action ID.
	 */
	public function schedule_single( $timestamp, $hook, $args = array(), $group = '' ) {
		return as_schedule_single_action( $timestamp, $hook, $args, $group );
	}

	/**
	 * Schedule a recurring action
	 *
	 * @param int    $timestamp When the first instance of the job will run.
	 * @param int    $interval_in_seconds How long to wait between runs.
	 * @param string $hook The hook to trigger.
	 * @param array  $args Arguments to pass when the hook triggers.
	 * @param string $group The group to assign this job to.
	 * @return string The action ID.
	 */
	public function schedule_recurring( $timestamp, $interval_in_seconds, $hook, $args = array(), $group = '' ) {
		return as_schedule_recurring_action( $timestamp, $interval_in_seconds, $hook, $args, $group );
	}

	/**
	 * Schedule an action that recurs on a cron-like schedule.
	 *
	 * @param int    $timestamp The schedule will start on or after this time.
	 * @param string $cron_schedule A cron-link schedule string.
	 * @see http://en.wikipedia.org/wiki/Cron
	 *   *    *    *    *    *    *
	 *   ┬    ┬    ┬    ┬    ┬    ┬
	 *   |    |    |    |    |    |
	 *   |    |    |    |    |    + year [optional]
	 *   |    |    |    |    +----- day of week (0 - 7) (Sunday=0 or 7)
	 *   |    |    |    +---------- month (1 - 12)
	 *   |    |    +--------------- day of month (1 - 31)
	 *   |    +-------------------- hour (0 - 23)
	 *   +------------------------- min (0 - 59)
	 * @param string $hook The hook to trigger.
	 * @param array  $args Arguments to pass when the hook triggers.
	 * @param string $group The group to assign this job to.
	 * @return string The action ID
	 */
	public function schedule_cron( $timestamp, $cron_schedule, $hook, $args = array(), $group = '' ) {
		return as_schedule_cron_action( $timestamp, $cron_schedule, $hook, $args, $group );
	}

	/**
	 * Dequeue all actions with a matching hook (and optionally matching args and group) so they are not run.
	 *
	 * Any recurring actions with a matching hook will also be cancelled, not just the next scheduled action.
	 *
	 * Technically, one action in a recurring or Cron action is scheduled at any one point in time. The next
	 * in the sequence is scheduled after the previous one is run, so only the next scheduled action needs to
	 * be cancelled/dequeued to stop the sequence.
	 *
	 * @param string $hook The hook that the job will trigger.
	 * @param array  $args Args that would have been passed to the job.
	 * @param string $group Group name.
	 */
	public function cancel( $hook, $args = array(), $group = '' ) {
		as_unschedule_action( $hook, $args, $group );
	}

	/**
	 * Get the date and time for the next scheduled occurence of an action with a given hook
	 * (an optionally that matches certain args and group), if any.
	 *
	 * @param string $hook Hook name.
	 * @param array  $args Arguments.
	 * @param string $group Group name.
	 * @return timestamp|null The date and time for the next occurrence, or null if there is no pending, scheduled action for the given hook.
	 */
	public function get_next( $hook, $args = null, $group = '' ) {

		$next_timestamp = as_next_scheduled_action( $hook, $args, $group );

		if ( false !== $next_timestamp ) {
			return $next_timestamp;
		}

		return null;
	}

	/**
	 * Find scheduled actions
	 *
	 * @param array  $args Possible arguments, with their default values:
	 *        'hook' => '' - the name of the action that will be triggered
	 *        'args' => null - the args array that will be passed with the action
	 *        'date' => null - the scheduled date of the action. Expects a DateTime object, a unix timestamp, or a string that can parsed with strtotime(). Used in UTC timezone.
	 *        'date_compare' => '<=' - operator for testing "date". accepted values are '!=', '>', '>=', '<', '<=', '='
	 *        'modified' => null - the date the action was last updated. Expects a DateTime object, a unix timestamp, or a string that can parsed with strtotime(). Used in UTC timezone.
	 *        'modified_compare' => '<=' - operator for testing "modified". accepted values are '!=', '>', '>=', '<', '<=', '='
	 *        'group' => '' - the group the action belongs to
	 *        'status' => '' - ActionScheduler_Store::STATUS_COMPLETE or ActionScheduler_Store::STATUS_PENDING
	 *        'claimed' => null - TRUE to find claimed actions, FALSE to find unclaimed actions, a string to find a specific claim ID
	 *        'per_page' => 5 - Number of results to return
	 *        'offset' => 0
	 *        'orderby' => 'date' - accepted values are 'hook', 'group', 'modified', or 'date'
	 *        'order' => 'ASC'.
	 *
	 * @param string $return_format OBJECT, ARRAY_A, or ids.
	 * @return array
	 */
	public function search( $args = array(), $return_format = OBJECT ) {
		return as_get_scheduled_actions( $args, $return_format );
	}
}
