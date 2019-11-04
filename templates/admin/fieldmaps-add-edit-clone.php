<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
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

	<div id="poststuff">
		<div id="post-body" class="metabox-holder columns-2 sfwp-o-fieldmap">
			<div class="postbox-container" id="postbox-container-1">
				<div class="meta-box-sortables ui-sortable">
					<div class="postbox">
						<button type="button" class="handlediv" aria-expanded="true"><span class="screen-reader-text"><?php echo esc_html__( 'Toggle panel: Save Fieldmap', 'object-sync-for-salesforce' ); ?></span><span class="toggle-indicator" aria-hidden="true"></span></button>
						<h2 class="hndle ui-sortable-handle"><span><?php echo esc_html__( 'Save Fieldmap', 'object-sync-for-salesforce' ); ?></span></h2>
						<div class="submitpost">
							<div id="major-publishing-actions">
								<div id="delete-action">
								<a class="submitdelete deletion" href="#"><?php echo esc_html__( 'Delete', 'object-sync-for-salesforce' ); ?></a></div>

							<div id="publishing-action">
								<span class="spinner"></span>
										<input name="original_publish" type="hidden" id="original_publish" value="<?php echo esc_html__( 'Update', 'object-sync-for-salesforce' ); ?>">
									<input name="save" type="submit" class="button button-primary button-large" id="publish" value="<?php echo esc_html__( 'Update', 'object-sync-for-salesforce' ); ?>">
									</div>
							<div class="clear"></div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="postbox-container" id="postbox-container-2">
				<header class="postbox sfwp-m-fieldmap-group sfwp-m-fieldmap-label">
					<label for="sfwp_label"><?php echo esc_html__( 'Fieldmap Label', 'object-sync-for-salesforce' ); ?></label>
					<div class="sfwp-m-fieldmap-fields">
						<input name="label" id="sfwp_label" type="text" required value="<?php echo isset( $label ) ? esc_html( $label ) : ''; ?>">
					</div>
				</header>
				<section class="postbox sfwp-m-fieldmap-group sfwp-m-wordpress-object">
					<header>
						<label for="sfwp_wordpress_object"><?php echo esc_html__( 'WordPress Object', 'object-sync-for-salesforce' ); ?></label>
					</header>
					<div class="sfwp-m-fieldmap-fields">
						<select id="sfwp_wordpress_object" name="wordpress_object" required>
							<option value="">- <?php echo esc_html__( 'Select object type', 'object-sync-for-salesforce' ); ?> -</option>
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
						<section class="sfwp-m-fieldmap-subgroup sfwp-m-wordpress-data-settings">
							<!-- default post status goes here -->
							<label for="sfwp_push_drafts"><?php echo esc_html__( 'Push Draft Posts', 'object-sync-for-salesforce' ); ?></label>
							<div class="sfwp-m-fieldmap-subgroup-fields checkbox">
								<input type="checkbox" name="push_drafts" id="sfwp_push_drafts" value="1" <?php echo isset( $push_drafts ) && '1' === $push_drafts ? ' checked' : ''; ?>>
							</div>
							<label for="sfwp_pull_to_drafts"><?php echo esc_html__( 'Pull to Draft Posts', 'object-sync-for-salesforce' ); ?></label>
							<div class="sfwp-m-fieldmap-subgroup-fields checkbox">
								<input type="checkbox" name="pull_to_drafts" id="sfwp_pull_to_drafts" value="1" <?php echo isset( $pull_to_drafts ) && '1' === $pull_to_drafts ? ' checked' : ''; ?>>
							</div>
							<label for="sfwp_push_immediately"><?php echo esc_html__( 'Push changes immediately', 'object-sync-for-salesforce' ); ?></label>
							<div class="sfwp-m-fieldmap-subgroup-fields checkbox">
								<input type="checkbox" name="push_immediately" id="sfwp_push_immediately" value="1" <?php echo isset( $push_immediately ) && '1' === $push_immediately ? ' checked' : ''; ?>>
							</div>
						</section>
					</div>
				</section>
				<section class="postbox sfwp-m-fieldmap-group sfwp-m-salesforce-object">
					<header>
						<label for="swfp_salesforce_object"><?php echo esc_html__( 'Salesforce Object', 'object-sync-for-salesforce' ); ?></label>
					</header>
					<div class="sfwp-m-fieldmap-fields">
						<select id="swfp_salesforce_object" name="salesforce_object" required>
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
								echo sprintf(
									'<option value="%1$s"%2$s>%3$s</option>',
									esc_html( $object['name'] ),
									esc_attr( $selected ),
									esc_html( $object['label'] )
								);
							}
							?>
						</select>
						<?php if ( empty( $salesforce_objects ) ) : ?>
							<p class="description">
								<?php
								echo sprintf(
									// translators: 1) is the link to troubleshooting object maps in the plugin documentation
									'<strong>' . esc_html__( 'The plugin is unable to access any Salesforce objects for object mapping.', 'object-sync-for-salesforce' ) . '</strong>' . esc_html__( ' This is most likely a permissions issue. See %1$s in the plugin documentation for more information and possible solutions.', 'object-sync-for-salesforce' ) . '</strong>',
									'<a href="https://github.com/MinnPost/object-sync-for-salesforce/blob/271-object-map-permission-issues/docs/troubleshooting.md#object-map-issues">troubleshooting object maps</a>'
								);
								?>
							</p>
						<?php endif; ?>
						<section class="sfwp-m-fieldmap-subgroup sfwp-m-salesforce-record-types-allowed">
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
									<header>
										<h3><?php echo esc_html__( 'Allowed Record Types', 'object-sync-for-salesforce' ); ?></h3>
									</header>
									<div class="sfwp-m-fieldmap-subgroup-fields checkboxes">
									<?php foreach ( $record_types['recordTypeInfos'] as $key => $value ) : ?>
										<?php
										if ( in_array( $key, $salesforce_record_types_allowed, true ) ) {
											$checked = ' checked';
										} else {
											$checked = '';
										}
										echo sprintf(
											'<label><input type="checkbox" class="form-checkbox" value="%1$s" name="%2$s" id="%3$s"%4$s>%5$s</label>',
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
						</section>
						<section class="sfwp-m-fieldmap-subgroup sfwp-m-salesforce-record-type-default">
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
									<header>
										<label for="sfwp_salesforce_record_type_default"><?php echo esc_html__( 'Default Record Type', 'object-sync-for-salesforce' ); ?>:</label>
									</header>
									<div class="sfwp-m-fieldmap-subgroup-fields select">
										<select id="sfwp_salesforce_record_type_default" name="salesforce_record_type_default" required><option value="">- <?php echo esc_html__( 'Select record type', 'object-sync-for-salesforce' ); ?> -</option>
										<?php
										foreach ( $record_types['recordTypeInfos'] as $key => $value ) :
											if ( isset( $salesforce_record_type_default ) && $salesforce_record_type_default === $key ) {
												$selected = ' selected';
											} else {
												$selected = '';
											}
											if ( ! isset( $salesforce_record_types_allowed ) || in_array( $key, $salesforce_record_types_allowed, true ) ) {
												echo sprintf(
													'<option value="%1$s"%2$s>%3$s</option>',
													esc_attr( $key ),
													esc_attr( $selected ),
													esc_html( $value )
												);
											}
										endforeach;
										?>
										</select>
									</div>
									<?php
								endif;
							endif;
							?>
						</section>
						<section class="sfwp-m-fieldmap-subgroup sfwp-m-pull-trigger-field">
							<?php if ( isset( $pull_trigger_field ) ) : ?>
								<header>
									<label for="sfwp_pull_trigger_field"><?php echo esc_html__( 'Date field to trigger pull', 'object-sync-for-salesforce' ); ?></label>
								</header>
								<?php
								$object_fields = $this->get_salesforce_object_fields(
									array(
										'salesforce_object' => $salesforce_object,
										'type'              => 'datetime',
									)
								);
								?>
								<div class="sfwp-m-fieldmap-subgroup-fields select">
									<select name="pull_trigger_field" id="sfwp_pull_trigger_field">
									<?php
									foreach ( $object_fields as $key => $value ) {
										if ( $pull_trigger_field === $value['name'] ) {
											$selected = ' selected';
										} else {
											$selected = '';
										}
										echo sprintf(
											'<option value="%1$s"%2$s>%3$s</option>',
											esc_attr( $value['name'] ),
											esc_attr( $selected ),
											esc_html( $value['label'] )
										);
									}
									?>
									</select>
								</div>
							<?php endif; ?>
						</div>
					</section>
				</section>
				<section class="postbox sfwp-m-fieldmap-group sfwp-o-fields">
					<header>
						<h2><?php echo esc_html__( 'Field Mappings', 'object-sync-for-salesforce' ); ?></h2>
					</header>
					<div class="sfwp-m-fieldmap-fields">
						<ul class="sfwp-a-fieldmap-headings">
							<li class="sfwp-fieldmap-wordpress-object"><?php echo esc_html__( 'WordPress Object', 'object-sync-for-salesforce' ); ?></li>
							<li class="sfwp-fieldmap-salesforce-object"><?php echo esc_html__( 'Salesforce Object', 'object-sync-for-salesforce' ); ?></li>
							<li class="sfwp-fieldmap-direction"><?php echo esc_html__( 'Direction', 'object-sync-for-salesforce' ); ?></li>
							<li class="sfwp-fieldmap-actions">&nbsp;</li>
						</ul>
						<?php
						if ( isset( $fieldmap_fields ) && null !== $fieldmap_fields && is_array( $fieldmap_fields ) ) {
							foreach ( $fieldmap_fields as $key => $value ) {
								$key = md5( $key . time() );
								if ( 'sync' === $value['direction'] ) {
									$direction_label = esc_html__( 'Sync', 'object-sync-for-salesforce' );
								} elseif ( 'sf_wp' === $value['direction'] ) {
									$direction_label = esc_html__( 'Salesforce to WordPress', 'object-sync-for-salesforce' );
								} elseif ( 'wp_sf' === $value['direction'] ) {
									$direction_label = esc_html__( 'WordPress to Salesforce', 'object-sync-for-salesforce' );
								}
								?>
								<ul class="sfwp-a-fieldmap-values" id="<?php echo $key; ?>">
									<li class="sfwp-fieldmap-wordpress-object"><?php echo $value['wordpress_field']['label']; ?></li>
									<li class="sfwp-fieldmap-salesforce-object"><?php echo $value['salesforce_field']['label']; ?></li>
									<li class="sfwp-fieldmap-direction"><?php echo $direction_label; ?></li>
									<li class="sfwp-fieldmap-actions">
										<a href="#"><?php echo esc_html__( 'Expand to Edit', 'object-sync-for-salesforce' ); ?></a><a href="#"><?php echo esc_html__( 'Delete', 'object-sync-for-salesforce' ); ?></a>
									</li>
								</ul>
								<?php
							}
						}
						?>
						<?php
						if ( isset( $fieldmap_fields ) && null !== $fieldmap_fields ) {
							$add_button_label = esc_html__( 'Add another field mapping', 'object-sync-for-salesforce' );
						} else {
							$add_button_label = esc_html__( 'Add field mapping', 'object-sync-for-salesforce' );
						}
						?>
						<p><button type="button" id="add-field-mapping" class="button button-secondary"><?php echo $add_button_label; ?></button></p>
						<article class="sfwp-o-expanded-fieldmap sfwp-o-new-fieldmap">
							<ul class="sfwp-a-fieldmap-headings">
								<li class="sfwp-fieldmap-wordpress-object"><?php echo esc_html__( 'WordPress Object', 'object-sync-for-salesforce' ); ?></li>
								<li class="sfwp-fieldmap-salesforce-object"><?php echo esc_html__( 'Salesforce Object', 'object-sync-for-salesforce' ); ?></li>
								<li class="sfwp-fieldmap-direction"><?php echo esc_html__( 'Direction', 'object-sync-for-salesforce' ); ?></li>
								<li class="sfwp-fieldmap-actions">&nbsp;</li>
							</ul>

							<section class="postbox sfwp-m-fieldmap-group sfwp-m-wordpress-field">
								<header>
									<label for="sfwp_wordpress_field"><?php echo esc_html__( 'WordPress Field', 'object-sync-for-salesforce' ); ?></label>
								</header>
								<div class="sfwp-m-fieldmap-fields">
									<select name="wordpress_field" id="sfwp_wordpress_field">
										<option value="">- <?php echo esc_html__( 'Select WordPress field', 'object-sync-for-salesforce' ); ?> -</option>
										<?php
										$wordpress_fields = $this->get_wordpress_object_fields( $wordpress_object );
										foreach ( $wordpress_fields as $wordpress_field ) {
											if ( isset( $value['wordpress_field']['label'] ) && $value['wordpress_field']['label'] === $wordpress_field['key'] ) {
												$selected = ' selected';
											} else {
												$selected = '';
											}
											echo sprintf(
												'<option value="%1$s"%2$s>%3$s</option>',
												esc_attr( $wordpress_field['key'] ),
												esc_attr( $selected ),
												esc_html( $wordpress_field['key'] )
											);
										}
										?>
									</select>

									<section class="sfwp-m-fieldmap-subgroup sfwp-m-wordpress-date-format">
										<!-- default post status goes here -->
										<label for="sfwp_date_format"><?php echo esc_html__( 'Date Format', 'object-sync-for-salesforce' ); ?></label>
										<div class="sfwp-m-fieldmap-subgroup-fields date">
											<input type="text" name="date_format" id="sfwp_date_format" value="">
										</div>
									</section>
								</div>
							</section>

						</article>
					</div>
				</section>
				<section class="postbox sfwp-m-fieldmap-group sfwp-m-action-triggers">
					<header>
						<h3><?php echo esc_html__( 'Action Triggers', 'object-sync-for-salesforce' ); ?></h3>
					</header>
					<div class="sfwp-m-fieldmap-fields sfwp-m-checkboxes">
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
						<label for="sfwp_sync_triggers_wordpress_create"><?php echo esc_html__( 'WordPress create', 'object-sync-for-salesforce' ); ?></label>
						<div class="sfwp-m-fieldmap-subgroup-fields checkbox">
							<input type="checkbox" value="<?php echo esc_html( $this->mappings->sync_wordpress_create ); ?>" name="sync_triggers[]" id="sfwp_sync_triggers_wordpress_create" <?php echo esc_attr( $wordpress_create_checked ); ?>>
						</div>

						<label for="sfwp_sync_triggers_wordpress_update"><?php echo esc_html__( 'WordPress update', 'object-sync-for-salesforce' ); ?></label>
						<div class="sfwp-m-fieldmap-subgroup-fields checkbox">
							<input type="checkbox" value="<?php echo esc_html( $this->mappings->sync_wordpress_update ); ?>" name="sync_triggers[]" id="sfwp_sync_triggers_wordpress_update" <?php echo esc_attr( $wordpress_update_checked ); ?>>
						</div>

						<label for="sfwp_sync_triggers_wordpress_delete"><?php echo esc_html__( 'WordPress delete', 'object-sync-for-salesforce' ); ?></label>
						<div class="sfwp-m-fieldmap-subgroup-fields checkbox">
							<input type="checkbox" value="<?php echo esc_html( $this->mappings->sync_wordpress_delete ); ?>" name="sync_triggers[]" id="sfwp_sync_triggers_wordpress_delete" <?php echo esc_attr( $wordpress_delete_checked ); ?>>
						</div>

						<label for="sfwp_sync_triggers_salesforce_create"><?php echo esc_html__( 'Salesforce create', 'object-sync-for-salesforce' ); ?></label>
						<div class="sfwp-m-fieldmap-subgroup-fields checkbox">
							<input type="checkbox" value="<?php echo esc_html( $this->mappings->sync_sf_create ); ?>" name="sync_triggers[]" id="sfwp_sync_triggers_salesforce_create" <?php echo esc_attr( $salesforce_create_checked ); ?>>
						</div>

						<label for="sfwp_sync_triggers_salesforce_update"><?php echo esc_html__( 'Salesforce update', 'object-sync-for-salesforce' ); ?></label>
						<div class="sfwp-m-fieldmap-subgroup-fields checkbox">
							<input type="checkbox" value="<?php echo esc_html( $this->mappings->sync_sf_update ); ?>" name="sync_triggers[]" id="sfwp_sync_triggers_salesforce_update" <?php echo esc_attr( $salesforce_update_checked ); ?>>
						</div>

						<label for="sfwp_sync_triggers_salesforce_delete"><?php echo esc_html__( 'Salesforce delete', 'object-sync-for-salesforce' ); ?></label>
						<div class="sfwp-m-fieldmap-subgroup-fields checkbox">
							<input type="checkbox" value="<?php echo esc_html( $this->mappings->sync_sf_delete ); ?>" name="sync_triggers[]" id="sfwp_sync_triggers_salesforce_delete" <?php echo esc_attr( $salesforce_delete_checked ); ?>>
						</div>

						<p class="description">
							<?php
							// translators: placeholders are for the class names: salesforce_push and salesforce_pull
							echo sprintf( esc_html__( 'Select which actions on WordPress objects and Salesforce objects should trigger a synchronization. These settings are used by the %1$s and %2$s classes respectively.', 'object-sync-for-salesforce' ), '<code>salesforce_push</code>', '<code>salesforce_pull</code>' );
							?>
						</p>
					</div>
				</section>
				<?php
				submit_button(
					esc_html__( 'Save Fieldmap', 'object-sync-for-salesforce' )
				);
				?>
			</div>
		</div>
	</div>
</form>
