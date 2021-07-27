<?php
/**
 * The form to add and edit fieldmaps, which map a WordPress and Salesforce object type together.
 *
 * @package Object_Sync_Salesforce
 */

?>
<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="<?php echo esc_html( $fieldmap_class ); ?>">
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

	<?php
	/* Used to save closed meta boxes and their order */
	wp_nonce_field( 'meta-box-order', 'meta-box-order-nonce', false );
	wp_nonce_field( 'closedpostboxes', 'closedpostboxesnonce', false );
	?>

	<div id="poststuff">
		<div id="post-body" class="metabox-holder columns-2 sfwp-o-fieldmap">
			<div class="postbox-container" id="postbox-container-1">
				<div class="meta-box-sortables ui-sortable">
					<div class="postbox">
						<div class="postbox-header">
							<h2 class="hndle ui-sortable-handle">
								<span><?php echo esc_html__( 'Save Fieldmap', 'object-sync-for-salesforce' ); ?></span>
							</h2>
							<div class="handle-actions hide-if-no-js">
								<button type="button" class="handlediv" aria-expanded="true">
									<span class="screen-reader-text"><?php echo esc_html__( 'Toggle panel: Save Fieldmap', 'object-sync-for-salesforce' ); ?></span>
									<span class="toggle-indicator" aria-hidden="true"></span>
								</button>
							</div>
						</div>
						<div class="inside">
							<div class="submitbox">
								<div id="minor-publishing">
									<div class="misc-pub-section misc-pub-post-status"><?php echo esc_html__( 'Save or delete your fieldmap.', 'object-sync-for-salesforce' ); ?></div>
								</div>
								<div id="major-publishing-actions">
									<div id="delete-action">
										<a class="submitdelete deletion" href="#"><?php echo esc_html__( 'Delete', 'object-sync-for-salesforce' ); ?></a>
									</div>
									<div id="publishing-action">
										<span class="spinner spinner-save"></span>
										<input name="original_publish" type="hidden" id="original_publish" value="<?php echo esc_html__( 'Save', 'object-sync-for-salesforce' ); ?>">
										<input name="save" type="submit" class="button button-primary button-large" id="save" value="<?php echo esc_html__( 'Save', 'object-sync-for-salesforce' ); ?>">
									</div>
									<div class="clear"></div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="postbox-container" id="postbox-container-2">
				<header class="postbox sfwp-m-fieldmap-group sfwp-m-fieldmap-label">
					<label for="sfwp-label"><?php echo esc_html__( 'Fieldmap Label', 'object-sync-for-salesforce' ); ?></label>
					<div class="sfwp-m-fieldmap-fields">
						<input name="label" id="sfwp-label" type="text" required value="<?php echo isset( $label ) ? esc_html( $label ) : ''; ?>">
					</div>
				</header>
				<section class="postbox sfwp-m-fieldmap-group sfwp-m-wordpress-object">
					<header>
						<label for="sfwp-wordpress-object"><?php echo esc_html__( 'WordPress Object', 'object-sync-for-salesforce' ); ?></label>
						<div class="spinner spinner-wordpress"></div>
					</header>
					<div class="sfwp-m-fieldmap-fields">
						<select id="sfwp-wordpress-object" name="wordpress_object" required>
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
						<section class="sfwp-m-fieldmap-subgroup sfwp-m-wordpress-data-settings">
							<?php $statuses = $this->wordpress->get_wordpress_object_statuses( $wordpress_object ); ?>
							<div class="sfwp-m-fieldmap-group-fields sfwp-m-single-select sfwp-m-wordpress-statuses wordpress-statuses-template">
								<label for="sfwp-default-status"><?php echo esc_html__( 'Default Status', 'object-sync-for-salesforce' ); ?></label>
								<select name="wordpress_object_default_status" id="sfwp-default-status" style="width: 60%;">
									<option value="">- <?php echo esc_html__( 'Select Default Status', 'object-sync-for-salesforce' ); ?> -</option>
									<?php if ( ! empty( $statuses ) ) : ?>
										<?php foreach ( $statuses as $key => $value ) : ?>
											<?php
											if ( isset( $wordpress_object_default_status ) && $wordpress_object_default_status === $key ) {
												$selected = ' selected';
											} else {
												$selected = '';
											}
											if ( is_string( $value ) ) {
												echo sprintf(
													'<option value="%1$s"%2$s>%3$s</option>',
													esc_attr( $key ),
													esc_attr( $selected ),
													esc_html( $value )
												);
											}
											?>
										<?php endforeach; ?>
									<?php endif; ?>
								</select>
							</div>
							<?php
							$template_class = '';
							if ( empty( $statuses['all_draft_statuses'] ) ) {
								$template_class = ' sfwp-m-drafts-template';
							}
							?>
							<div class="sfwp-m-fieldmap-group-fields sfwp-m-single-checkboxes sfwp-m-wordpress-drafts<?php echo esc_html( $template_class ); ?>">
								<label class="sfwp-a-single-checkbox">
									<span><?php echo esc_html__( 'Push Drafts to Salesforce', 'object-sync-for-salesforce' ); ?></span>
									<input type="checkbox" name="push_drafts" id="sfwp-push-drafts" value="1" <?php echo isset( $push_drafts ) && '1' === $push_drafts ? ' checked' : ''; ?>></label>
								<label class="sfwp-a-single-checkbox">
									<span><?php echo esc_html__( 'Pull to Drafts in WordPress', 'object-sync-for-salesforce' ); ?></span>
									<input type="checkbox" name="pull_to_drafts" id="sfwp-pull-to-drafts" value="1" <?php echo isset( $pull_to_drafts ) && '1' === $pull_to_drafts ? ' checked' : ''; ?>>
								</label>
							</div>
							<div class="sfwp-m-fieldmap-group-fields sfwp-m-single-checkbox-separate-label sfwp-m-push-immediately">
								<label for="sfwp-push-immediately"><?php echo esc_html__( 'Push changes immediately', 'object-sync-for-salesforce' ); ?></label>
								<div class="sfwp-m-fieldmap-subgroup-fields checkbox">
									<input type="checkbox" name="push_immediately" id="sfwp-push-immediately" value="1" <?php echo isset( $push_immediately ) && '1' === $push_immediately ? ' checked' : ''; ?>>
								</div>
								<p class="description"><?php echo esc_html__( 'If you check this box, the plugin will try to save data to Salesforce immediately, rather than placing it into the queue system. Often this is not necessary.', 'object-sync-for-salesforce' ); ?></p>
							</div>
						</section>
					</div>
				</section>
				<section class="postbox sfwp-m-fieldmap-group sfwp-m-salesforce-object">
					<header>
						<label for="sfwp-salesforce-object"><?php echo esc_html__( 'Salesforce Object', 'object-sync-for-salesforce' ); ?></label>
						<div class="spinner spinner-salesforce"></div>
					</header>
					<div class="sfwp-m-fieldmap-fields">
						<select id="sfwp-salesforce-object" name="salesforce_object" required>
							<option value="">- <?php echo esc_html__( 'Select Object Type', 'object-sync-for-salesforce' ); ?> -</option>
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
							// allow for api name or field label to be the display value in the <select>.
							$display_value = get_option( $this->option_prefix . 'salesforce_field_display_value', 'field_label' );
							foreach ( $salesforce_objects as $object ) {

								if ( 'api_name' === $display_value ) {
									$object['label'] = $object['name'];
								}

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
									// translators: 1) is the link to troubleshooting object maps in the plugin documentation.
									'<strong>' . esc_html__( 'The plugin is unable to access any Salesforce objects for object mapping.', 'object-sync-for-salesforce' ) . '</strong>' . esc_html__( ' This is most likely a permissions issue. See %1$s in the plugin documentation for more information and possible solutions.', 'object-sync-for-salesforce' ) . '</strong>',
									'<a href="https://github.com/MinnPost/object-sync-for-salesforce/blob/271-object-map-permission-issues/docs/troubleshooting.md#object-map-issues">troubleshooting object maps</a>'
								);
								?>
							</p>
						<?php endif; ?>
						<section class="sfwp-m-fieldmap-subgroup sfwp-m-salesforce-record-types-allowed record-types-allowed-template <?php echo isset( $salesforce_object ) ? 'sfwp-m-salesforce-record-types-allowed-' . esc_html( $salesforce_object ) : ''; ?>">
							<header>
								<h3><?php echo esc_html__( 'Allowed Record Types', 'object-sync-for-salesforce' ); ?></h3>
							</header>
							<div class="sfwp-m-fieldmap-subgroup-fields checkboxes">
								<?php
								if ( isset( $salesforce_record_types_allowed ) ) :
									$record_types = $this->get_salesforce_object_description(
										array(
											'salesforce_object' => $salesforce_object,
											'include' => 'recordTypeInfos',
										)
									);
									?>
									<?php if ( isset( $record_types['recordTypeInfos'] ) ) : ?>
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
									<?php endif; ?>
								<?php endif; ?>
							</div>
						</section>
						<section class="sfwp-m-fieldmap-subgroup sfwp-m-salesforce-record-type-default record-type-default-template">
							<header>
								<label for="sfwp-salesforce-record-type-default"><?php echo esc_html__( 'Default Record Type', 'object-sync-for-salesforce' ); ?>:</label>
							</header>
							<div class="sfwp-m-fieldmap-subgroup-fields select">
								<?php
								$required     = '';
								$record_types = $this->get_salesforce_object_description(
									array(
										'salesforce_object' => $salesforce_object,
										'include' => 'recordTypeInfos',
									)
								);
								if ( isset( $salesforce_record_type_default ) ) {
									$required = ' required';
								}
								?>
								<select id="sfwp-salesforce-record-type-default" name="salesforce_record_type_default"<?php echo esc_html( $required ); ?> style="width: 60%;">
									<option value="">- <?php echo esc_html__( 'Select Record Type', 'object-sync-for-salesforce' ); ?> -</option>
								<?php
								if ( isset( $salesforce_record_type_default ) ) :
									?>
										<?php
										if ( isset( $record_types['recordTypeInfos'] ) ) {
											foreach ( $record_types['recordTypeInfos'] as $key => $value ) {
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
											}
										}
										?>
									</select>
								<?php endif; ?>
							</div>
						</section>
						<section class="sfwp-m-fieldmap-subgroup sfwp-m-pull-trigger-field<?php echo ! isset( $pull_trigger_field ) ? ' pull-trigger-field-template' : ''; ?> <?php echo isset( $salesforce_object ) ? 'sfwp-m-pull-trigger-field-' . esc_html( $salesforce_object ) : ''; ?>">
							<header>
								<label for="sfwp-pull-trigger-field"><?php echo esc_html__( 'Date Field to Trigger a Pull', 'object-sync-for-salesforce' ); ?></label>
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
								<select name="pull_trigger_field" id="sfwp-pull-trigger-field" style="width: 60%;">
									<option value="">- <?php echo esc_html__( 'Select Date field', 'object-sync-for-salesforce' ); ?> -</option>
									<?php
									if ( ! empty( $object_fields ) ) {
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
									}
									?>
								</select>
								<p class="description"><?php echo esc_html__( 'When the plugin checks for data to bring from Salesforce into WordPress, it will use the selected field to determine what relevant changes have occurred in Salesforce.', 'object-sync-for-salesforce' ); ?></p>
							</div>
						</div>
					</section>
				</section>
				<section class="postbox sfwp-m-fieldmap-group sfwp-o-fields">
					<header>
						<h2><?php echo esc_html__( 'Field Mappings', 'object-sync-for-salesforce' ); ?></h2>
					</header>
					<div class="sfwp-m-fieldmap-fields">
						<ul class="sfwp-a-fieldmap-headings">
							<li class="sfwp-fieldmap-wordpress-field">
								<h3><?php echo esc_html__( 'WordPress Field', 'object-sync-for-salesforce' ); ?></h3>
							</li>
							<li class="sfwp-fieldmap-salesforce-field">
								<h3>
									<?php echo esc_html__( 'Salesforce Field', 'object-sync-for-salesforce' ); ?></h3>
								</li>
							<li class="sfwp-fieldmap-direction">
								<h3>
									<?php echo esc_html__( 'Direction', 'object-sync-for-salesforce' ); ?></h3>
								</li>
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
								$salesforce_option_type = '';
								if ( isset( $salesforce_field['name']['type'] ) ) {
									if ( in_array( $salesforce_field['name']['type'], $this->mappings->date_types_from_salesforce, true ) ) {
										$salesforce_option_type = ' class="date"';
									}
								}
								?>
								<ul class="sfwp-a-fieldmap-values" data-key="<?php echo esc_attr( $key ); ?>" class="already-saved-fields">
									<li class="sfwp-fieldmap-wordpress-field">
										<h4><?php echo esc_html( $value['wordpress_field']['label'] ); ?></h4>
									</li>
									<li class="sfwp-fieldmap-salesforce-field">
										<h4><?php echo esc_html( $value['salesforce_field']['label'] ); ?></h4>
									</li>
									<li class="sfwp-fieldmap-direction">
										<h4><?php echo esc_html( $direction_label ); ?></h4>
									</li>
									<li class="sfwp-fieldmap-actions row-actions">
										<span class="edit">
											<a href="#" class="sfwp-a-fieldmap-field-action sfwp-a-fieldmap-field-action-edit edit"><?php echo esc_html__( 'Expand to Edit', 'object-sync-for-salesforce' ); ?></a>
										</span>
										<span class="delete">
											<a href="#" class="sfwp-a-fieldmap-field-action sfwp-a-fieldmap-field-action-delete delete"><?php echo esc_html__( 'Delete', 'object-sync-for-salesforce' ); ?></a>
										</span>
									</li>
									<li class="sfwp-fieldmap-form-container">
										<article class="postbox sfwp-o-fieldmap-form sfwp-fieldmap-wordpress-field">
											<header>
												<label for="wordpress-field-<?php echo esc_attr( $key ); ?>"><?php echo esc_html__( 'WordPress Field', 'object-sync-for-salesforce' ); ?></label>
											</header>
											<div class="sfwp-m-fieldmap-subgroup-fields select">
												<select name="wordpress_field[<?php echo esc_attr( $key ); ?>]" id="wordpress-field-<?php echo esc_attr( $key ); ?>" style="width: 100%;">
													<option value="">- <?php echo esc_html__( 'Select WordPress Field', 'object-sync-for-salesforce' ); ?> -</option>
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
												<p class="description">
													<?php
													// translators: the placeholders refer to: 1) the cache clear link, 2) the cache clear link text.
													echo sprintf(
														esc_html__( 'To map a custom meta field (such as post meta, user meta, term meta, etc.), WordPress must have at least one value for that field. If you add a new meta field and want to map it, make sure to add a value for it and ', 'object-sync-for-salesforce' ) . '<a href="%1$s" id="clear-sfwp-cache">%2$s</a>' . esc_html__( ' to see the field listed here.', 'object-sync-for-salesforce' ),
														esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=clear_cache' ) ),
														esc_html__( 'clear the plugin cache', 'object-sync-for-salesforce' )
													);
													?>
												</p>
											</div>
										</article>
										<article class="postbox sfwp-o-fieldmap-form sfwp-fieldmap-salesforce-field">
											<header>
												<label for="sfwp-salesforce-field-<?php echo esc_attr( $key ); ?>"><?php echo esc_html__( 'Salesforce Field', 'object-sync-for-salesforce' ); ?></label>
											</header>
											<div class="sfwp-m-fieldmap-subgroup-fields select">
												<select name="salesforce_field[<?php echo esc_attr( $key ); ?>]" id="sfwp-salesforce-field-<?php echo esc_attr( $key ); ?>" style="width: 100%;">
													<option value="">- <?php echo esc_html__( 'Select Salesforce Field', 'object-sync-for-salesforce' ); ?> -</option>
													<?php
													$salesforce_fields = $this->get_salesforce_object_fields(
														array(
															'salesforce_object' => $salesforce_object,
														)
													);
													// allow for api name or field label to be the display value in the <select>.
													$display_value = get_option( $this->option_prefix . 'salesforce_field_display_value', 'field_label' );
													foreach ( $salesforce_fields as $salesforce_field ) {
														if ( isset( $value['salesforce_field']['name'] ) && $value['salesforce_field']['name'] === $salesforce_field['name'] ) {
															$selected = ' selected';
														} elseif ( isset( $value['salesforce_field']['label'] ) && $value['salesforce_field']['label'] === $salesforce_field['name'] ) {
															// this conditional is for versions up to 1.1.2, but it's fine to leave it. if we remove it, people's fieldmaps will not show correctly in the admin until they resave. it would be nice to avoid this.
															$selected = ' selected';
														} else {
															$selected = '';
														}
														if ( 'api_name' === $display_value ) {
															$salesforce_field['label'] = $salesforce_field['name'];
														}
														if ( false === $salesforce_field['nillable'] ) {
															$salesforce_field['label'] .= ' *';
														}

														if ( false === $salesforce_field['updateable'] ) {
															$salesforce_field['label'] .= ' 🔒';
														}

														echo sprintf(
															'<option value="%1$s"%2$s%3$s>%4$s</option>',
															esc_attr( $salesforce_field['name'] ),
															esc_attr( $selected ),
															esc_html( $salesforce_option_type ),
															esc_html( $salesforce_field['label'] ),
														);
													}
													?>
												</select>
												<p class="description">
													<?php echo esc_html__( 'Salesforce fields containing a * are required fields for this object type.', 'object-sync-for-salesforce' ); ?>
												</p>
												<p class="description">
													<?php echo esc_html__( 'Salesforce fields containing a 🔒 are locked fields for this object type. This means you can pull data from them into WordPress, but you cannot push data to them from WordPress.', 'object-sync-for-salesforce' ); ?>
												</p>
												<div class="sfwp-field-dependent-fields sfwp-field-date-format sfwp-field-dependent-fields-template">
													<label for="sfwp-wordpress-date-format-<?php echo esc_attr( $key ); ?>"><?php echo esc_html__( 'Date Format', 'object-sync-for-salesforce' ); ?></label>
													<div class="sfwp-m-field-dependent-field">
														<input name="date-format[<?php echo esc_attr( $key ); ?>]" id="sfwp-wordpress-date-format-<?php echo esc_attr( $key ); ?>" type="text" value="<?php echo isset( $date_format ) ? esc_html( $date_format ) : ''; ?>">
													</div>
													<p class="description">
														<?php
														// enter a default format that users can override.
														// translators: the placeholders refer to: 1) the cache clear link, 2) the cache clear link text.
														echo sprintf(
															esc_html__( 'The plugin will match this date format before saving the value of this Salesforce field into WordPress. Date fields coming from WordPress are formatted for Salesforce API requirements. Get valid PHP date formats %1$.', 'object-sync-for-salesforce' ),
															'<a href="https://www.php.net/manual/en/function.date.php">' . esc_html__( 'directly from the PHP website', 'object-sync-for-salesforce' ) . '</a>'
														);
														?>
													</p>
												</div>
											</div>
										</article>
										<div class="postbox sfwp-o-fieldmap-form">
											<p class="sfwp-m-fieldmap-subgroup-actions">
												<button type="button" id="finish-field-mapping-<?php echo esc_attr( $key ); ?>" class="button button-secondary sfwp-a-fieldmap-field-action sfwp-a-fieldmap-field-action-edit"><?php echo esc_html__( 'Close This Field Mapping', 'object-sync-for-salesforce' ); ?></button> <a href="#" class="sfwp-a-fieldmap-field-action sfwp-a-fieldmap-field-action-delete"><?php echo esc_html__( 'Delete This Field Mapping', 'object-sync-for-salesforce' ); ?></a>
											</p>
										</div>
									</li>
								</ul>
								<?php
							}
						}
						?>


						<!-- this needs to reproduce the loaded version -->
						<ul class="sfwp-a-fieldmap-values sfwp-a-fieldmap-values-template" data-key="0">
							
							<li class="sfwp-fieldmap-wordpress-field">
								<h4>- <?php echo esc_html__( 'Select WordPress Field', 'object-sync-for-salesforce' ); ?> -</h4>
							</li>
							<li class="sfwp-fieldmap-salesforce-field">
								<h4>- <?php echo esc_html__( 'Select Salesforce Field', 'object-sync-for-salesforce' ); ?> -</h4>
							</li>
							<li class="sfwp-fieldmap-direction">
								<h4>- <?php echo esc_html__( 'Select Direction', 'object-sync-for-salesforce' ); ?> -</h4>
							</li>
							<li class="sfwp-fieldmap-actions">
								<a href="#" class="sfwp-a-fieldmap-field-action sfwp-a-fieldmap-field-action-edit"><?php echo esc_html__( 'Expand to Edit', 'object-sync-for-salesforce' ); ?></a><a href="#" class="sfwp-a-fieldmap-field-action sfwp-a-fieldmap-field-action-delete"><?php echo esc_html__( 'Delete', 'object-sync-for-salesforce' ); ?></a>
							</li>
							<li class="sfwp-fieldmap-form-container">
								<article class="postbox sfwp-o-fieldmap-form sfwp-fieldmap-wordpress-field">
									<header>
										<label for="wordpress-field-0"><?php echo esc_html__( 'WordPress Field', 'object-sync-for-salesforce' ); ?></label>
									</header>
									<div class="sfwp-m-fieldmap-subgroup-fields select">
										<select name="wordpress_field[0]" id="wordpress-field-0" style="width: 100%;">
											<option value="">- <?php echo esc_html__( 'Select WordPress Field', 'object-sync-for-salesforce' ); ?> -</option>
											<?php
											$wordpress_fields = $this->get_wordpress_object_fields( $wordpress_object );
											foreach ( $wordpress_fields as $wordpress_field ) {
												$disabled = '';
												$key      = null;
												$needle   = $wordpress_field['key']; // the current WP field.
												// check the already mapped fields for the current field.
												array_walk(
													$fieldmap_fields,
													function( $v, $k ) use ( &$key, $needle ) {
														if ( in_array( $needle, $v['wordpress_field'], true ) ) {
															$key = $k;
														}
													}
												);
												// disable fields that are already mapped.
												if ( null !== $key ) {
													$disabled = ' disabled';
												}
												echo sprintf(
													'<option value="%1$s"%3$s>%2$s</option>',
													esc_attr( $wordpress_field['key'] ),
													esc_html( $wordpress_field['key'] ),
													esc_attr( $disabled )
												);
											}
											?>
										</select>
										<p class="description">
											<?php
											// translators: the placeholders refer to: 1) the cache clear link, 2) the cache clear link text.
											echo sprintf(
												esc_html__( 'To map a custom meta field (such as post meta, user meta, term meta, etc.), WordPress must have at least one value for that field. If you add a new meta field and want to map it, make sure to add a value for it and ', 'object-sync-for-salesforce' ) . '<a href="%1$s" id="clear-sfwp-cache">%2$s</a>' . esc_html__( ' to see the field listed here.', 'object-sync-for-salesforce' ),
												esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=clear_cache' ) ),
												esc_html__( 'clear the plugin cache', 'object-sync-for-salesforce' )
											);
											?>
										</p>
									</div>
								</article>
								<article class="postbox sfwp-o-fieldmap-form sfwp-fieldmap-salesforce-field">
									<header>
										<label for="sfwp-salesforce-field-0"><?php echo esc_html__( 'Salesforce Field', 'object-sync-for-salesforce' ); ?></label>
									</header>
									<div class="sfwp-m-fieldmap-subgroup-fields select">
										<select name="salesforce_field[0]" id="sfwp-salesforce-field-0" style="width: 100%;">
											<option value="">- <?php echo esc_html__( 'Select Salesforce Field', 'object-sync-for-salesforce' ); ?> -</option>
											<?php
											$salesforce_fields = $this->get_salesforce_object_fields(
												array(
													'salesforce_object' => $salesforce_object,
												)
											);
											// allow for api name or field label to be the display value in the <select>.
											$display_value = get_option( $this->option_prefix . 'salesforce_field_display_value', 'field_label' );
											foreach ( $salesforce_fields as $salesforce_field ) {
												$disabled = '';
												$key      = null;
												$needle   = $salesforce_field['name']; // the current Salesforce field.
												// check the already mapped fields for the current field.
												array_walk(
													$fieldmap_fields,
													function( $v, $k ) use ( &$key, $needle ) {
														if ( in_array( $needle, $v['salesforce_field'], true ) ) {
															$key = $k;
														}
													}
												);
												// disable fields that are already mapped.
												if ( null !== $key ) {
													$disabled = ' disabled';
												}

												if ( 'api_name' === $display_value ) {
													$salesforce_field['label'] = $salesforce_field['name'];
												}

												if ( false === $salesforce_field['nillable'] ) {
													$salesforce_field['label'] .= ' *';
												}

												if ( false === $salesforce_field['updateable'] ) {
													$locked = ' 🔒';
												} else {
													$locked = '';
												}

												echo sprintf(
													'<option value="%1$s"%2$s>%3$s%4$s</option>',
													esc_attr( $salesforce_field['name'] ),
													esc_attr( $disabled ),
													esc_html( $salesforce_field['label'] ),
													esc_attr( $locked )
												);
											}
											?>
										</select>
										<p class="description">
											<?php echo esc_html__( 'Salesforce fields containing a * are required fields for this object type.', 'object-sync-for-salesforce' ); ?>
										</p>
										<p class="description">
											<?php echo esc_html__( 'Salesforce fields containing a 🔒 are locked fields for this object type. This means you can pull data from them into WordPress, but you cannot push data to them from WordPress.', 'object-sync-for-salesforce' ); ?>
										</p>
										<div class="sfwp-field-dependent-fields sfwp-field-date-format sfwp-field-dependent-fields-template">
											<label for="sfwp-wordpress-date-format-0"><?php echo esc_html__( 'Date Format', 'object-sync-for-salesforce' ); ?></label>
											<div class="sfwp-m-field-dependent-field">
												<input name="date-format[0]" id="sfwp-wordpress-date-format-0" type="text" value="<?php echo isset( $date_format ) ? esc_html( $date_format ) : ''; ?>">
											</div>
											<p class="description">
												<?php
												// enter a default format that users can override.
												// translators: the placeholders refer to: 1) the cache clear link, 2) the cache clear link text.
												echo sprintf(
													esc_html__( 'The plugin will match this date format before saving the value of this Salesforce field into WordPress. Date fields coming from WordPress are formatted for Salesforce API requirements. Get valid PHP date formats %1$.', 'object-sync-for-salesforce' ),
													'<a href="https://www.php.net/manual/en/function.date.php">' . esc_html__( 'directly from the PHP website', 'object-sync-for-salesforce' ) . '</a>'
												);
												?>
											</p>
										</div>
									</div>
								</article>
								<div class="postbox sfwp-o-fieldmap-form">
									<p class="sfwp-m-fieldmap-subgroup-actions">
										<button type="button" id="finish-field-mapping-<?php echo esc_attr( $key ); ?>" class="button button-secondary sfwp-a-fieldmap-field-action sfwp-a-fieldmap-field-action-edit"><?php echo esc_html__( 'Close This Field Mapping', 'object-sync-for-salesforce' ); ?></button> <a href="#" class="sfwp-a-fieldmap-field-action sfwp-a-fieldmap-field-action-delete"><?php echo esc_html__( 'Delete This Field Mapping', 'object-sync-for-salesforce' ); ?></a>
									</p>
								</div>
							</li>

						</ul>


						<?php
						if ( isset( $fieldmap_fields ) && null !== $fieldmap_fields ) {
							$add_button_label = esc_html__( 'Add another field mapping', 'object-sync-for-salesforce' );
						} else {
							$add_button_label = esc_html__( 'Add field mapping', 'object-sync-for-salesforce' );
						}
						?>
						<p><button type="button" id="add-field-mapping" class="button button-secondary"><?php echo esc_html( $add_button_label ); ?></button></p>


					</div>
				</section>
				<section class="postbox sfwp-m-fieldmap-group sfwp-m-action-triggers">
					<header>
						<h3><?php echo esc_html__( 'Action Triggers', 'object-sync-for-salesforce' ); ?></h3>
					</header>
					<div class="sfwp-m-fieldmap-fields sfwp-m-single-checkboxes">
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
						<label for="sfwp-sync-triggers-wordpress-create">
							<span><?php echo esc_html__( 'WordPress Create', 'object-sync-for-salesforce' ); ?></span>
							<input type="checkbox" value="<?php echo esc_html( $this->mappings->sync_wordpress_create ); ?>" name="sync_triggers[]" id="sfwp-sync-triggers-wordpress-create" <?php echo esc_attr( $wordpress_create_checked ); ?>>
						</label>

						<label for="sfwp-sync-triggers-wordpress-update">
							<span><?php echo esc_html__( 'WordPress Update', 'object-sync-for-salesforce' ); ?></span>
							<input type="checkbox" value="<?php echo esc_html( $this->mappings->sync_wordpress_update ); ?>" name="sync_triggers[]" id="sfwp-sync-triggers-wordpress-update" <?php echo esc_attr( $wordpress_update_checked ); ?>>
						</label>

						<label for="sfwp-sync-triggers-wordpress-delete">
							<span><?php echo esc_html__( 'WordPress Delete', 'object-sync-for-salesforce' ); ?></span>
							<input type="checkbox" value="<?php echo esc_html( $this->mappings->sync_wordpress_delete ); ?>" name="sync_triggers[]" id="sfwp-sync-triggers-wordpress-delete" <?php echo esc_attr( $wordpress_delete_checked ); ?>>
						</label>

						<label for="sfwp-sync-triggers-salesforce-create">
							<span><?php echo esc_html__( 'Salesforce Create', 'object-sync-for-salesforce' ); ?></span>
							<input type="checkbox" value="<?php echo esc_html( $this->mappings->sync_sf_create ); ?>" name="sync_triggers[]" id="sfwp-sync-triggers-salesforce-create" <?php echo esc_attr( $salesforce_create_checked ); ?>>
						</label>

						<label for="sfwp-sync-triggers-salesforce-update">
							<span><?php echo esc_html__( 'Salesforce Update', 'object-sync-for-salesforce' ); ?></span>
							<input type="checkbox" value="<?php echo esc_html( $this->mappings->sync_sf_update ); ?>" name="sync_triggers[]" id="sfwp-sync-triggers-salesforce-update" <?php echo esc_attr( $salesforce_update_checked ); ?>>
						</label>

						<label for="sfwp-sync-triggers-salesforce-delete">
							<span><?php echo esc_html__( 'Salesforce Delete', 'object-sync-for-salesforce' ); ?></span>
							<input type="checkbox" value="<?php echo esc_html( $this->mappings->sync_sf_delete ); ?>" name="sync_triggers[]" id="sfwp-sync-triggers-salesforce-delete" <?php echo esc_attr( $salesforce_delete_checked ); ?>>
						</label>

						<p class="description"><?php echo esc_html__( 'Select which actions on WordPress objects and Salesforce objects should trigger a synchronization. These settings are used when the plugin pushes data to, and pulls data from, Salesforce.', 'object-sync-for-salesforce' ); ?></p>
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
