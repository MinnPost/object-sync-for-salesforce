<?php
/**
 * The form to edit a mapping error, connecting it to the correct record.
 *
 * @package Object_Sync_Salesforce
 */

?>

<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="fieldmap object_map">
	<input type="hidden" name="redirect_url_error" value="<?php echo esc_url( $error_url ); ?>" />
	<input type="hidden" name="redirect_url_success" value="<?php echo esc_url( $success_url ); ?>" />
	<?php if ( isset( $transient ) ) { ?>
	<input type="hidden" name="transient" value="<?php echo esc_html( $transient ); ?>" />
	<?php } ?>
	<input type="hidden" name="action" value="post_object_map" >
	<input type="hidden" name="method" value="<?php echo esc_attr( $method ); ?>" />
	<?php if ( 'edit' === $method ) { ?>
	<input type="hidden" name="id" value="<?php echo absint( $map_row['id'] ); ?>" />
	<?php } ?>
	<h2><?php echo esc_html__( 'Edit Object Map', 'object-sync-for-salesforce' ); ?></h2>
	<fieldset>
		<div class="object_map_field wordpress_id">
			<label for="wordpress_id"><?php echo esc_html__( 'WordPress ID', 'object-sync-for-salesforce' ); ?>: </label>
			<input type="text" id="wordpress_id" name="wordpress_id" required value="<?php echo isset( $wordpress_id ) ? esc_html( $wordpress_id ) : ''; ?>" />
		</div>
		<div class="object_map_field wordpress_object">
			<label for="wordpress_object"><?php echo esc_html__( 'WordPress Object Type', 'object-sync-for-salesforce' ); ?>: </label>
			<select id="wordpress_object" name="wordpress_object" required>
				<option value="">- <?php echo esc_html__( 'Select Object Type', 'object-sync-for-salesforce' ); ?> -</option>
				<?php
				$wordpress_objects = $this->wordpress->wordpress_objects;
				foreach ( $wordpress_objects as $object ) {
					if ( isset( $wordpress_object ) && $wordpress_object === $object ) {
						$selected = ' selected';
					} else {
						$selected = '';
					}
					echo sprintf(
						'<option value="%1$s"%2$s>%3$s</option>',
						esc_html( $object ),
						esc_attr( $selected ),
						esc_html( $object )
					);
				}
				?>
			</select>
		</div>
		<div class="object_map_field salesforce_id">
			<label for="salesforce_id"><?php echo esc_html__( 'Salesforce Id', 'object-sync-for-salesforce' ); ?>: </label>
			<input type="text" id="salesforce_id" name="salesforce_id" required value="<?php echo isset( $salesforce_id ) ? esc_html( $salesforce_id ) : ''; ?>" />
		</div>
	</fieldset>
	<?php
		submit_button(
			// translators: the placeholder refers to the currently selected method (edit or delete).
			sprintf( esc_html__( '%1$s object map', 'object-sync-for-salesforce' ), ucfirst( $method ) )
		);
		?>
</form>

<div class="object_map_data">
	<h2><?php echo esc_html__( 'Object Map Details', 'object-sync-for-salesforce' ); ?></h2>
	<p><?php echo esc_html__( 'To assist in debugging, this is the additional information the plugin has stored about this object map.', 'object-sync-for-salesforce' ); ?></p>
	<ul>
		<li>
			<span class="dashicons dashicons-calendar"></span>
			<?php
			echo sprintf(
				// translators: placeholder is the object map's creation date.
				wp_kses_post( __( '<span class="label">Created Date:</span> %1$s', 'object-sync-for-salesforce' ) ),
				esc_attr( wp_date( 'Y-m-d g:i:sa', strtotime( $map_row['created'] ) ) )
			);
			?>
		</li>
		<li>
			<span class="dashicons dashicons-calendar"></span>
			<?php
			echo sprintf(
				// translators: placeholder is the object map's last updated date.
				wp_kses_post( __( '<span class="label">Last Updated Date:</span> %1$s', 'object-sync-for-salesforce' ) ),
				esc_attr( wp_date( 'Y-m-d g:i:sa', strtotime( $map_row['object_updated'] ) ) )
			);
			?>
		</li>
		<li>
			<span class="dashicons dashicons-calendar"></span>
			<?php
			echo sprintf(
				// translators: placeholder is the object map's last sync date.
				wp_kses_post( __( '<span class="label">Last Sync Date:</span> %1$s', 'object-sync-for-salesforce' ) ),
				esc_attr( wp_date( 'Y-m-d g:i:sa', strtotime( $map_row['last_sync'] ) ) )
			);
			?>
		</li>
		<li>
			<?php if ( 'push' === $map_row['last_sync_action'] ) : ?>
				<span class="dashicons dashicons-arrow-right-alt"></span>
			<?php elseif ( 'pull' === $map_row['last_sync_action'] ) : ?>
				<span class="dashicons dashicons-arrow-left-alt"></span>
			<?php endif; ?>
			<?php
			echo sprintf(
				// translators: placeholder is the object map's last sync action.
				wp_kses_post( __( '<span class="label">Last Sync Action:</span> %1$s', 'object-sync-for-salesforce' ) ),
				esc_attr( $map_row['last_sync_action'] )
			);
			?>
		</li>
		<li>
			<?php if ( '0' === $map_row['last_sync_status'] ) : ?>
				<span class="dashicons dashicons-dismiss"></span>
			<?php elseif ( '1' === $map_row['last_sync_status'] ) : ?>
				<span class="dashicons dashicons-yes-alt"></span>
			<?php endif; ?>
			<?php
			echo sprintf(
				// translators: placeholder is the object map's last sync status in error or success.
				wp_kses_post( __( '<span class="label">Last Sync Status:</span> %1$s', 'object-sync-for-salesforce' ) ),
				( esc_attr( '0' ) === esc_attr( $map_row['last_sync_status'] ) ) ? esc_attr( 'error' ) : esc_attr( 'success' )
			);
			?>
		</li>
		<li>
			<span class="dashicons dashicons-warning"></span>
			<?php
			echo sprintf(
				// translators: placeholder is the object map's last sync message.
				wp_kses_post( __( '<span class="label">Last Sync Message:</span> %1$s', 'object-sync-for-salesforce' ) ),
				esc_attr( $map_row['last_sync_message'] )
			);
			?>
		</li>
	</ul>
</div>

<div class="object_map_data">
	<h2><?php echo esc_html__( 'Data Access Links', 'object-sync-for-salesforce' ); ?></h2>
	<p><?php echo esc_html__( 'This section will change based on what data is available to the plugin. If it is able to detect a valid WordPress or Salesforce ID, it will link to that record. If the record does not exist, there will be no link.', 'object-sync-for-salesforce' ); ?></p>
	<ul>
	<?php if ( '' !== esc_url( $this->wordpress->object_edit_link( $map_row['wordpress_object'], $map_row['wordpress_id'] ) ) ) : ?>
		<li>
			<span class="dashicons dashicons-edit-large"></span>
			<a href="<?php echo esc_url( $this->wordpress->object_edit_link( $map_row['wordpress_object'], $map_row['wordpress_id'] ) ); ?>">
				<?php
				echo sprintf(
					// translators: placeholder is the WordPress object type.
					esc_html__( 'Edit WordPress %1$s', 'object-sync-for-salesforce' ),
					esc_attr( ucfirst( $map_row['wordpress_object'] ) )
				);
				?>
			</a>
		</li>
	<?php endif; ?>
	<?php if ( substr( $map_row['salesforce_id'], 0, 7 ) !== 'tmp_sf_' ) : ?>
		<li>
			<span class="dashicons dashicons-edit-large"></span>
			<a href="<?php echo esc_url( $this->salesforce['sfapi']->get_instance_url() . '/' . $map_row['salesforce_id'] ); ?>">
				<?php echo esc_html__( 'Edit Salesforce Object', 'object-sync-for-salesforce' ); ?>
			</a>
		</li>
	<?php endif; ?>
	</ul>
</div>
