import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import {
  API_RESPONSE_DESCRIPTION_OVERRIDES,
  COMMON_API_RESPONSE_STATUSES,
  HTTP_STATUS_MESSAGES,
} from '../../constants/http-status.constant';

function getDescription(status: number): string {
  return (
    API_RESPONSE_DESCRIPTION_OVERRIDES[status] ??
    HTTP_STATUS_MESSAGES[status] ??
    'Unknown'
  );
}

export function ApiCommonResponses(
  statuses: readonly number[] = COMMON_API_RESPONSE_STATUSES,
) {
  return applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({ status, description: getDescription(status) }),
    ),
  );
}
