<?php
/**
 * Class representing a Salesforce SELECT SOQL query.
 *
 * @class   Object_Sync_Sf_Salesforce_Select_Query
 * @package Object_Sync_Salesforce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Object_Sync_Sf_Salesforce_Select_Query class.
 */
class Object_Sync_Sf_Salesforce_Select_Query {

	/**
	 * Current version of the plugin
	 *
	 * @var string
	 */
	public $version;

	/**
	 * The plugin's prefix when saving options to the database
	 *
	 * @var string
	 */
	public $option_prefix;

	/**
	 * Salesforce object type
	 *
	 * @var string
	 */
	public $object_type;

	/**
	 * Fields for the SOQL query
	 *
	 * @var array
	 */
	public $fields;

	/**
	 * Order for the SOQL query
	 *
	 * @var array
	 */
	public $order;

	/**
	 * Limit for the SOQL query
	 *
	 * @var string
	 */
	public $limit;

	/**
	 * Offset for the SOQL query
	 *
	 * @var string
	 */
	public $offset;

	/**
	 * Conditions for the SOQL query
	 *
	 * @var array
	 */
	public $conditions;

	/**
	 * Constructor for mapping class
	 *
	 * @param string $object_type Salesforce object type to query.
	 */
	public function __construct( $object_type = '' ) {

		$this->version       = object_sync_for_salesforce()->version;
		$this->option_prefix = object_sync_for_salesforce()->option_prefix;

		$this->object_type = $object_type;
		$this->fields      = array();
		$this->order       = array();
		$this->conditions  = array();
	}

	/**
	 * Add a condition to the query.
	 *
	 * @param string $field Field name.
	 * @param mixed  $value Condition value. If an array, it will be split into quote enclosed strings separated by commas inside of parenthesis. Note that the caller must enclose the value in quotes as needed by the SF API.
	 * @param string $operator Conditional operator. One of '=', '!=', '<', '>', 'LIKE, 'IN', 'NOT IN'.
	 */
	public function add_condition( $field, $value, $operator = '=' ) {
		if ( is_array( $value ) ) {
			$value = "('" . implode( "','", $value ) . "')";

			// Set operator to IN if wasn't already changed from the default.
			if ( '=' === $operator ) {
				$operator = 'IN';
			}
		}
		$this->conditions[] = array(
			'field'    => $field,
			'operator' => $operator,
			'value'    => $value,
		);
	}

	/**
	 * Implements PHP's magic __toString().
	 * Function to convert the query to a string to pass to the SF API.
	 *
	 * @return string $query SOQL query ready to be executed the SF API.
	 */
	public function __toString() {

		$query  = 'SELECT ';
		$query .= implode( ', ', $this->fields );
		$query .= ' FROM ' . $this->object_type;

		if ( count( $this->conditions ) > 0 ) {
			$where = array();
			foreach ( $this->conditions as $condition ) {
				$where[] = implode( ' ', $condition );
			}
			$query .= ' WHERE ' . implode( ' AND ', $where );
		}

		if ( $this->order ) {
			$query .= ' ORDER BY ';
			$fields = array();
			foreach ( $this->order as $field => $direction ) {
				$fields[] = $field . ' ' . $direction;
			}
			$query .= implode( ', ', $fields );
		}

		if ( $this->limit ) {
			$query .= ' LIMIT ' . (int) $this->limit;
		}

		if ( $this->offset ) {
			$query .= ' OFFSET ' . (int) $this->offset;
		}

		$query_parameters = array(
			'object_type' => $this->object_type,
			'fields'      => $this->fields,
			'order'       => $this->order,
			'limit'       => $this->limit,
			'offset'      => $this->offset,
			'conditions'  => $this->conditions,
		);

		// add a filter here to modify the query once it's a string.
		// Hook to allow other plugins to modify the SOQL query before it is sent to Salesforce.
		$query = apply_filters( $this->option_prefix . 'pull_query_string_modify', $query, $query_parameters );

		// quick example to change the order to descending once the query is already a string.
		/* // phpcs:ignore Squiz.PHP.CommentedOutCode.Found
		add_filter( 'object_sync_for_salesforce_pull_query_string_modify', 'change_pull_query', 10, 2 );
		function change_pull_query_string( $query, $query_parameters ) {
			$query = str_replace( 'ASC', 'DESC', $query);
			return $query;
		}
		*/

		return $query;
	}

}
