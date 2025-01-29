export interface ListPermissionSetItem {
  name: string;
  permissionSetArn: string;
}

export interface ListPermissionSetOutput {
  permissionSets: Array<ListPermissionSetItem>;
}
