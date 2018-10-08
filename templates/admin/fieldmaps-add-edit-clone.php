<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="fieldmap">
	<input type="hidden" name="redirect_url_error" value="<?php echo esc_url( $error_url ); ?>" />
	<input type="hidden" name="redirect_url_success" value="<?php echo esc_url( $success_url ); ?>" />
	<?php if ( isset( $transient ) ) { ?>
	<input type="hidden" name="transient" value="<?php echo esc_html( $transient ); ?>" />
	<?php } ?>
	<input type="hidden" name="action" value="post_fieldmap" >
	<input type="hidden" name="method" value="<?php echo esc_attr( $method ); ?>" />
	<?php if ( 'edit' === $method ) { ?>
	<input type="hidden" name="id" value="<?php echo absint( $map['id'] ); ?>" />
	<?php } ?>
	<div class="fieldmap_label">
		<label for="label"><?php echo esc_html__( 'Label', 'object-sync-for-salesforce' ); ?>: </label>
		<input type="text" id="label" name="label" required value="<?php echo isset( $label ) ? esc_html( $label ) : ''; ?>" />
	</div>
	<fieldset class="wordpress_side">
		<div class="wordpress_object">
			<label for="wordpress_object"><?php echo esc_html__( 'WordPress Object', 'object-sync-for-salesforce' ); ?>: </label>
			<select id="wordpress_object" name="wordpress_object" required>
				<option value="">- <?php echo esc_html__( 'Select object type', 'object-sync-for-salesforce' ); ?> -</option>
				<?php
				$wordpress_objects = $this->wordpress->wordpress_objects;
				foreach ( $wordpress_objects as $object ) {
					if ( isset( $wordpress_object ) && $wordpress_object === $object ) {
						$selected = ' selected';
					} else {
						$selected = '';
					}
					echo sprintf( '<option value="%1$s"%2$s>%3$s</option>',
						esc_html( $object ),
						esc_attr( $selected ),
						esc_html( $object )
					);
				}
				?>
			</select>
		</div>
	</fieldset>
	<fieldset class="salesforce_side">
		<div class="salesforce_object">
			<label for="salesforce_object"><?php echo esc_html__( 'Salesforce Object', 'object-sync-for-salesforce' ); ?>: </label>
			<div class="spinner"></div>
			<select id="salesforce_object" name="salesforce_object" required>
				<option value="">- <?php echo esc_html__( 'Select object type', 'object-sync-for-salesforce' ); ?> -</option>
				<?php
				$sfapi          = $this->salesforce['sfapi'];
				$object_filters = maybe_unserialize( get_option( 'salesforce_api_object_filters' ), array() );
				$conditions     = array();
				if ( is_array( $object_filters ) && in_array( 'updateable', $object_filters, true ) ) {
					$conditions['updateable'] = true;
				}
				if ( is_array( $object_filters ) && in_array( 'triggerable', $object_filters, true ) ) {
					$conditions['triggerable'] = true;
				}
				$salesforce_objects = $sfapi->objects( $conditions );
				foreach ( $salesforce_objects as $object ) {
					if ( isset( $salesforce_object ) && $salesforce_object === $object['name'] ) {
						$selected = ' selected';
					} else {
						$selected = '';
					}
					echo sprintf( '<option value="%1$s"%2$s>%3$s</option>',
						esc_html( $object['name'] ),
						esc_attr( $selected ),
						esc_html( $object['label'] )
					);
				}
				?>
			</select>
		</div>
		<div class="salesforce_record_types_allowed">
			<?php
			if ( isset( $salesforce_record_types_allowed ) ) :
				$record_types = $this->get_salesforce_object_description(
					array(
						'salesforce_object' => $salesforce_object,
						'include'           => 'recordTypeInfos',
					)
				);
				if ( isset( $record_types['recordTypeInfos'] ) ) :
					?>
					<label for="salesforce_record_types_allowed"><?php echo __( 'Allowed Record Types', 'object-sync-for-salesforce' ); ?>:</label>
					<div class="checkboxes">
					<?php foreach ( $record_types['recordTypeInfos'] as $key => $value ) : ?>
						<?php
						if ( in_array( $key, $salesforce_record_types_allowed, true ) ) {
							$checked = ' checked';
						} else {
							$checked = '';
						}
						echo sprintf( '<label><input type="checkbox" class="form-checkbox" value="%1$s" name="%2$s" id="%3$s"%4$s>%5$s</label>',
							esc_html( $key ),
							esc_attr( 'salesforce_record_types_allowed[' . $key . ']' ),
							esc_attr( 'salesforce_record_types_allowed-' . $key ),
							esc_html( $checked ),
							esc_html( $value )
						);
						?>
					<?php endforeach; ?>
					</div>
				<?php endif; ?>
			<?php endif; ?>
		</div>
		<div class="salesforce_record_type_default">
			<?php
			if ( isset( $salesforce_record_type_default ) ) :
				$record_types = $this->get_salesforce_object_description(
					array(
						'salesforce_object' => $salesforce_object,
						'include'           => 'recordTypeInfos',
					)
				);
				if ( isset( $record_types['recordTypeInfos'] ) ) :
					?>
					<label for="salesforce_record_type_default"><?php echo __( 'Default Record Type', 'object-sync-for-salesforce' ); ?>:</label>
					<select id="salesforce_record_type_default" name="salesforce_record_type_default" required><option value="">- <?php echo __( 'Select record type', 'object-sync-for-salesforce' ); ?> -</option>
					<?php
					foreach ( $record_types['recordTypeInfos'] as $key => $value ) :
						if ( isset( $salesforce_record_type_default ) && $salesforce_record_type_default === $key ) {
							$selected = ' selected';
						} else {
							$selected = '';
						}
						if ( ! isset( $salesforce_record_types_allowed ) || in_array( $key, $salesforce_record_types_allowed, true ) ) {
							echo sprintf( '<option value="%1$s"%2$s>%3$s</option>',
								esc_attr( $key ),
								esc_attr( $selected ),
								esc_html( $value )
							);
						}
					endforeach;
					?>
					</select>
				<?php
				endif;
			endif;
			?>
		</div>
		<div class="pull_trigger_field">
			<?php if ( isset( $pull_trigger_field ) ) : ?>
				<label for="pull_trigger_field"><?php echo __( 'Date field to trigger pull', 'object-sync-for-salesforce' ); ?>:</label>
				<?php
				$object_fields = $this->get_salesforce_object_fields(
					array(
						'salesforce_object' => $salesforce_object,
						'type'              => 'datetime',
					)
				);
				?>
				<select name="pull_trigger_field" id="pull_trigger_field">
				<?php
				foreach ( $object_fields as $key => $value ) {
					if ( $pull_trigger_field === $value['name'] ) {
						$selected = ' selected';
					} else {
						$selected = '';
					}
					echo sprintf( '<option value="%1$s"%2$s>%3$s</option>',
						esc_attr( $value['name'] ),
						esc_attr( $selected ),
						esc_html( $value['label'] )
					);
				}
				?>
				</select>
				<p class="description"><?php echo esc_html__( 'When the plugin checks for data to bring from Salesforce into WordPress, it will use the selected field to determine what relevant changes have occurred in Salesforce.', 'object-sync-for-salesforce' ); ?></p>
			<?php endif; ?>
		</div>
	</fieldset>
	<fieldset class="fields">
		<legend><?php echo esc_html__( 'Fieldmap', 'object-sync-for-salesforce' ); ?></legend>
		<table class="wp-list-table widefat striped fields">
			<thead>
				<tr>
					<th class="column-wordpress_field"><?php echo esc_html__( 'WordPress Field', 'object-sync-for-salesforce' ); ?></th>
					<th class="column-salesforce_field"><?php echo esc_html__( 'Salesforce Field', 'object-sync-for-salesforce' ); ?></th>
					<th class="column-is_prematch"><?php echo esc_html__( 'Prematch', 'object-sync-for-salesforce' ); ?></th>
					<th class="column-is_key"><?php echo esc_html__( 'Salesforce Key', 'object-sync-for-salesforce' ); ?></th>
					<th class="column-direction"><?php echo esc_html__( 'Direction', 'object-sync-for-salesforce' ); ?></th>
					<th class="column-is_delete"><?php echo esc_html__( 'Delete', 'object-sync-for-salesforce' ); ?></th>
				</tr>
			</thead>
			<tfoot>
				<tr>
					<td colspan="6">
						<p><small>
							<?php
							// translators: the placeholders refer to: 1) the cache clear link, 2) the cache clear link text
							echo sprintf( '<strong>' . esc_html__( 'Note:', 'object-sync-for-salesforce' ) . '</strong>' . esc_html__( ' to map a custom meta field (such as wp_postmeta, wp_usermeta, wp_termmeta, etc.), WordPress must have at least one value for that field. If you add a new meta field and want to map it, make sure to add a value for it and ', 'object-sync-for-salesforce' ) . '<a href="%1$s" id="clear-sfwp-cache">%2$s</a>' . esc_html__( ' to see the field listed here', 'object-sync-for-salesforce' ),
								esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=clear_cache' ) ),
								esc_html__( 'clear the plugin cache', 'object-sync-for-salesforce' )
							);
							?>
						</small></p>
					</td>
				</tr>
			</tfoot>
			<tbody>
				<?php
				if ( isset( $fieldmap_fields ) && null !== $fieldmap_fields && is_array( $fieldmap_fields ) ) {
					foreach ( $fieldmap_fields as $key => $value ) {
						$key = md5( $key . time() );
				?>
				<tr>
					<td class="column-wordpress_field">
						<select name="wordpress_field[<?php echo esc_attr( $key ); ?>]" id="wordpress_field-<?php echo esc_attr( $key ); ?>">
							<option value="">- <?php echo esc_html__( 'Select WordPress field', 'object-sync-for-salesforce' ); ?> -</option>
							<?php
							$wordpress_fields = $this->get_wordpress_object_fields( $wordpress_object );
							foreach ( $wordpress_fields as $wordpress_field ) {
								if ( isset( $value['wordpress_field']['label'] ) && $value['wordpress_field']['label'] === $wordpress_field['key'] ) {
									$selected = ' selected';
								} else {
									$selected = '';
								}
								echo sprintf( '<option value="%1$s"%2$s>%3$s</option>',
									esc_attr( $wordpress_field['key'] ),
									esc_attr( $selected ),
									esc_html( $wordpress_field['key'] )
								);
							}
							?>
						</select>

					</td>
					<td class="column-salesforce_field">
						<select name="salesforce_field[<?php echo esc_attr( $key ); ?>]" id="salesforce_field-<?php echo esc_attr( $key ); ?>">
							<option value="">- <?php echo esc_html__( 'Select Salesforce field', 'object-sync-for-salesforce' ); ?> -</option>
							<?php
							$salesforce_fields = $this->get_salesforce_object_fields(
								array(
									'salesforce_object' => $salesforce_object,
								)
							);
							// allow for api name or field label to be the display value in the <select>
							$display_value = get_option( $this->option_prefix . 'salesforce_field_display_value', 'field_label' );
							foreach ( $salesforce_fields as $salesforce_field ) {
								if ( isset( $value['salesforce_field']['name'] ) && $value['salesforce_field']['name'] === $salesforce_field['name'] ) {
									$selected = ' selected';
								} elseif ( isset( $value['salesforce_field']['label'] ) && $value['salesforce_field']['label'] === $salesforce_field['name'] ) {
									// this conditional is for versions up to 1.1.2, but i think it's fine to leave it for now. if we remove it, people's fieldmaps will not show correctly in the admin.
									$selected = ' selected';
								} else {
									$selected = '';
								}

								if ( 'api_name' === $display_value ) {
									$salesforce_field['label'] = $salesforce_field['name'];
								}

								echo sprintf( '<option value="%1$s"%2$s>%3$s</option>',
									esc_attr( $salesforce_field['name'] ),
									esc_attr( $selected ),
									esc_html( $salesforce_field['label'] )
								);
							}
							?>
						</select>

					</td>
					<td class="column-is_prematch">
						<?php
						if ( isset( $value['is_prematch'] ) && '1' === $value['is_prematch'] ) {
							$checked = ' checked';
						} else {
							$checked = '';
						}
						?>
						<input type="checkbox" name="is_prematch[<?php echo esc_attr( $key ); ?>]" id="is_prematch-<?php echo esc_attr( $key ); ?>" value="1" <?php echo esc_attr( $checked ); ?> title="<?php echo esc_html__( 'This pair should be checked for existing matches in Salesforce before adding', 'object-sync-for-salesforce' ); ?>" />
					</td>
					<td class="column-is_key">
						<?php
						if ( isset( $value['is_key'] ) && '1' === $value['is_key'] ) {
							$checked = ' checked';
						} else {
							$checked = '';
						}
						?>
						<input type="checkbox" name="is_key[<?php echo esc_attr( $key ); ?>]" id="is_key-<?php echo esc_attr( $key ); ?>" value="1" <?php echo esc_attr( $checked ); ?> title="<?php echo esc_html__( 'This Salesforce field is an External ID in Salesforce', 'object-sync-for-salesforce' ); ?>" />
					</td>
					<td class="column-direction">
						<?php
						if ( isset( $value['direction'] ) ) {
							if ( 'sf_wp' === $value['direction'] ) {
								$checked_sf_wp = ' checked';
								$checked_wp_sf = '';
								$checked_sync  = '';
							} elseif ( 'wp_sf' === $value['direction'] ) {
								$checked_sf_wp = '';
								$checked_wp_sf = ' checked';
								$checked_sync  = '';
							} else {
								$checked_sf_wp = '';
								$checked_wp_sf = '';
								$checked_sync  = ' checked';
							}
						} else {
							$checked_sf_wp = '';
							$checked_wp_sf = '';
							$checked_sync  = ' checked'; // by default, start with Sync checked
						}
						?>
						<div class="radios">
							<label><input type="radio" value="sf_wp" name="direction[<?php echo esc_attr( $key ); ?>]" id="direction-<?php echo esc_attr( $key ); ?>-sf-wp" <?php echo esc_attr( $checked_sf_wp ); ?> required> <?php echo esc_html__( 'Salesforce to WordPress', 'object-sync-for-salesforce' ); ?></label>
							<label><input type="radio" value="wp_sf" name="direction[<?php echo esc_attr( $key ); ?>]" id="direction-<?php echo esc_attr( $key ); ?>-wp-sf" <?php echo esc_attr( $checked_wp_sf ); ?> required> <?php echo esc_html__( 'WordPress to Salesforce', 'object-sync-for-salesforce' ); ?></label>
							<label><input type="radio" value="sync" name="direction[<?php echo esc_attr( $key ); ?>]" id="direction-<?php echo esc_attr( $key ); ?>-sync" <?php echo esc_attr( $checked_sync ); ?> required> <?php echo esc_html__( 'Sync', 'object-sync-for-salesforce' ); ?></label>
						</div>
					</td>
					<td class="column-is_delete">
						<input type="checkbox" name="is_delete[<?php echo esc_attr( $key ); ?>]" id="is_delete-<?php echo esc_attr( $key ); ?>" value="1" />
					</td>
				</tr>
				<?php
					} // End foreach().
				} elseif ( isset( $wordpress_object ) && isset( $salesforce_object ) ) {
				?>
				<tr>
					<td class="column-wordpress_field">
						<select name="wordpress_field[0]" id="wordpress_field-0">
							<option value="">- <?php echo esc_html__( 'Select WordPress field', 'object-sync-for-salesforce' ); ?> -</option>
							<?php
							$wordpress_fields = $this->get_wordpress_object_fields( $wordpress_object );
							foreach ( $wordpress_fields as $wordpress_field ) {
								echo sprintf( '<option value="%1$s">%2$s</option>',
									esc_attr( $wordpress_field['key'] ),
									esc_html( $wordpress_field['key'] )
								);
							}
							?>
						</select>
					</td>
					<td class="column-salesforce_field">
						<select name="salesforce_field[0]" id="salesforce_field-0">
							<option value="">- <?php echo esc_html__( 'Select Salesforce field', 'object-sync-for-salesforce' ); ?> -</option>
							<?php
							$salesforce_fields = $this->get_salesforce_object_fields(
								array(
									'salesforce_object' => $salesforce_object,
								)
							);
							foreach ( $salesforce_fields as $salesforce_field ) {
								echo sprintf( '<option value="%1$s">%2$s</option>',
									esc_attr( $salesforce_field['name'] ),
									esc_html( $salesforce_field['label'] )
								);
							}
							?>
						</select>
					</td>
					<td class="column-is_prematch">
						<input type="checkbox" name="is_prematch[0]" id="is_prematch-0" value="1" />
					</td>
					<td class="column-is_key">
						<input type="checkbox" name="is_key[0]" id="is_key-0" value="1" />
					</td>
					<td class="column-direction">
						<div class="radios">
							<label><input type="radio" value="sf_wp" name="direction[0]" id="direction-0-sf-wp" required> <?php echo esc_html__( 'Salesforce to WordPress', 'object-sync-for-salesforce' ); ?></label>
							<label><input type="radio" value="wp_sf" name="direction[0]" id="direction-0-wp-sf" required> <?php echo esc_html__( 'WordPress to Salesforce', 'object-sync-for-salesforce' ); ?></label>
							<label><input type="radio" value="sync" name="direction[0]" id="direction-0-sync" required checked> <?php echo esc_html__( 'Sync', 'object-sync-for-salesforce' ); ?></label>
						</div>
					</td>
					<td class="column-is_delete">
						<input type="checkbox" name="is_delete[0]" id="is_delete-0" value="1" />
					</td>
				</tr>
				<?php
				} // End if().
				?>
			</tbody>
		</table>
		<!--<div class="spinner"></div>-->
		<?php
		if ( isset( $fieldmap_fields ) && null !== $fieldmap_fields ) {
			$add_button_label = esc_html__( 'Add another field mapping', 'object-sync-for-salesforce' );
		} else {
			$add_button_label = esc_html__( 'Add field mapping', 'object-sync-for-salesforce' );
		}
		?>
		<p><button type="button" id="add-field-mapping" class="button button-secondary"><?php echo $add_button_label; ?></button></p>
		<p class="description"><?php echo esc_html__( 'A checked Prematch (when saving data in either WordPress or Salesforce) or Salesforce Key (only when saving data from WordPress to Salesforce) field will cause the plugin to check for a match on that value before creating new records.', 'object-sync-for-salesforce' ); ?></p>
	</fieldset>
	<fieldset class="sync_triggers">
		<legend><?php echo esc_html__( 'Action triggers', 'object-sync-for-salesforce' ); ?></legend>
		<div class="checkboxes">
			<?php
			$wordpress_create_checked  = '';
			$wordpress_update_checked  = '';
			$wordpress_delete_checked  = '';
			$salesforce_create_checked = '';
			$salesforce_update_checked = '';
			$salesforce_delete_checked = '';
			if ( isset( $sync_triggers ) && is_array( $sync_triggers ) ) {
				foreach ( $sync_triggers as $trigger ) {
					switch ( $trigger ) {
						case $this->mappings->sync_wordpress_create:
							$wordpress_create_checked = ' checked';
							break;
						case $this->mappings->sync_wordpress_update:
							$wordpress_update_checked = ' checked';
							break;
						case $this->mappings->sync_wordpress_delete:
							$wordpress_delete_checked = ' checked';
							break;
						case $this->mappings->sync_sf_create:
							$salesforce_create_checked = ' checked';
							break;
						case $this->mappings->sync_sf_update:
							$salesforce_update_checked = ' checked';
							break;
						case $this->mappings->sync_sf_delete:
							$salesforce_delete_checked = ' checked';
							break;
					}
				}
			}
			?>
			<label><input type="checkbox" value="<?php echo esc_html( $this->mappings->sync_wordpress_create ); ?>" name="sync_triggers[]" id="sync_triggers-wordpress-create" <?php echo esc_attr( $wordpress_create_checked ); ?>><?php echo esc_html__( 'WordPress create', 'object-sync-for-salesforce' ); ?></label>
			<label><input type="checkbox" value="<?php echo esc_html( $this->mappings->sync_wordpress_update ); ?>" name="sync_triggers[]" id="sync_triggers-wordpress-update" <?php echo esc_attr( $wordpress_update_checked ); ?>><?php echo esc_html__( 'WordPress update', 'object-sync-for-salesforce' ); ?></label>
			<label><input type="checkbox" value="<?php echo esc_html( $this->mappings->sync_wordpress_delete ); ?>" name="sync_triggers[]" id="sync_triggers-wordpress-delete" <?php echo esc_attr( $wordpress_delete_checked ); ?>><?php echo esc_html__( 'WordPress delete', 'object-sync-for-salesforce' ); ?></label>
			<label><input type="checkbox" value="<?php echo esc_html( $this->mappings->sync_sf_create ); ?>" name="sync_triggers[]" id="sync_triggers-salesforce-create" <?php echo esc_attr( $salesforce_create_checked ); ?>><?php echo esc_html__( 'Salesforce create', 'object-sync-for-salesforce' ); ?></label>
			<label><input type="checkbox" value="<?php echo esc_html( $this->mappings->sync_sf_update ); ?>" name="sync_triggers[]" id="sync_triggers-salesforce-update" <?php echo esc_attr( $salesforce_update_checked ); ?>><?php echo esc_html__( 'Salesforce update', 'object-sync-for-salesforce' ); ?></label>
			<label><input type="checkbox" value="<?php echo esc_html( $this->mappings->sync_sf_delete ); ?>" name="sync_triggers[]" id="sync_triggers-salesforce-delete" <?php echo esc_attr( $salesforce_delete_checked ); ?>><?php echo esc_html__( 'Salesforce delete', 'object-sync-for-salesforce' ); ?></label>
			<p class="description">
				<?php
				// translators: placeholders are for the class names: salesforce_push and salesforce_pull
				echo sprintf( esc_html__( 'Select which actions on WordPress objects and Salesforce objects should trigger a synchronization. These settings are used by the %1$s and %2$s classes respectively.', 'object-sync-for-salesforce' ), '<code>salesforce_push</code>', '<code>salesforce_pull</code>' );
				?>
			</p>
		</div>
		<div class="checkboxes">
			<label><input type="checkbox" name="push_async" id="process-async" value="1" <?php echo isset( $push_async ) && '1' === $push_async ? ' checked' : ''; ?>><?php echo esc_html__( 'Process asynchronously', 'object-sync-for-salesforce' ); ?></label>
			<p class="description">
				<?php
				// translators: placeholder is for WordPress cron method name
				echo sprintf( esc_html__( 'If selected, push data will be queued for processing and synchronized when %s is run. This may increase site performance, but changes will not be reflected in real time.', 'object-sync-for-salesforce' ), '<code>wp_cron</code>' );
				?>
			</p>
		</div>
		<div class="checkboxes">
			<label><input type="checkbox" name="push_drafts" id="push-drafts" value="1" <?php echo isset( $push_drafts ) && '1' === $push_drafts ? ' checked' : ''; ?>><?php echo esc_html__( 'Push drafts', 'object-sync-for-salesforce' ); ?></label>
			<p class="description"><?php echo esc_html__( 'If selected, WordPress will send drafts of this object type (if it creates drafts for it) to Salesforce.', 'object-sync-for-salesforce' ); ?></p>
		</div>
		<div class="checkboxes">
			<label><input type="checkbox" name="pull_to_drafts" id="pull-to-drafts" value="1" <?php echo isset( $pull_to_drafts ) && '1' === $pull_to_drafts ? ' checked' : ''; ?>><?php echo esc_html__( 'Pull to drafts', 'object-sync-for-salesforce' ); ?></label>
			<p class="description"><?php echo esc_html__( 'If selected, WordPress will pull data into drafts of this object type (if it creates drafts for it) from Salesforce, including when it attempts to match records.', 'object-sync-for-salesforce' ); ?></p>
		</div>
		<?php
		/*
		// we should make this visible when we can successfully sync multiple WordPress objects to the same Salesforce object.
		See this support issue: https://wordpress.org/support/topic/cant-map-multiple-wordpress-objects-to-the-same-salesforce-object/
		And this GitHub issue: https://github.com/MinnPost/object-sync-for-salesforce/issues/135
		<div class="fieldmap_label">
			<label for="label"><?php echo esc_html__( 'Weight', 'object-sync-for-salesforce' ); ?>: </label>
			<input type="number" id="weight" name="weight" value="<?php echo isset( $weight ) ? esc_html( $weight ) : ''; ?>" />
			<p class="description"><?php echo esc_html__( 'Weight is intended for use when you have multiple fieldmaps for the same object, either in WordPress or Salesforce.', 'object-sync-for-salesforce' ); ?></p>
			<p class="description"><?php echo sprintf( 'For example, if you map WordPress users to Salesforce Contacts, and then map the users to Salesforce Leads as well, you could assign a numeric weight to indicate which one gets processed first. Otherwise, you can safely leave it blank. If present, sorting occurs in ascending order.' ); ?></p>
		</div>
		*/
		?>
	</fieldset>
	<?php
		submit_button(
			// translators: the placeholder refers to the currently selected method (add, edit, or clone)
			sprintf( esc_html__( '%1$s fieldmap', 'object-sync-for-salesforce' ), ucfirst( $method ) )
		);
	?>
</form>
