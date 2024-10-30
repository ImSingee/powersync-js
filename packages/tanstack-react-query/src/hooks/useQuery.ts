import { parseQuery, type CompilableQuery, type ParsedQuery, type SQLWatchOptions } from '@powersync/common';
import { usePowerSync } from '@powersync/react';
import React from 'react';

import * as Tanstack from '@tanstack/react-query';

export type PowerSyncQueryOptions<T> = {
  query?: string | CompilableQuery<T>;
  parameters?: any[];
};

export type UseBaseQueryOptions<TQueryOptions> = TQueryOptions & PowerSyncQueryOptions<any>;

export function useQuery<TData = unknown, TError = Tanstack.DefaultError>(
  options: UseBaseQueryOptions<Tanstack.UseQueryOptions<TData, TError>> & { query?: undefined },
  queryClient?: Tanstack.QueryClient
): Tanstack.UseQueryResult<TData, TError>;

// Overload when 'query' is present
export function useQuery<TData = unknown, TError = Tanstack.DefaultError>(
  options: UseBaseQueryOptions<Tanstack.UseQueryOptions<TData[], TError>> & { query: string | CompilableQuery<TData> },
  queryClient?: Tanstack.QueryClient
): Tanstack.UseQueryResult<TData[], TError>;

export function useQuery<TData = unknown, TError = Tanstack.DefaultError>(
  options: UseBaseQueryOptions<Tanstack.UseQueryOptions<TData, TError>>,
  queryClient: Tanstack.QueryClient = Tanstack.useQueryClient()
) {
  return useQueryCore(options, queryClient, Tanstack.useQuery);
}

export function useSuspenseQuery<TData = unknown, TError = Tanstack.DefaultError>(
  options: UseBaseQueryOptions<Tanstack.UseSuspenseQueryOptions<TData, TError>> & { query?: undefined },
  queryClient?: Tanstack.QueryClient
): Tanstack.UseSuspenseQueryResult<TData, TError>;

// Overload when 'query' is present
export function useSuspenseQuery<TData = unknown, TError = Tanstack.DefaultError>(
  options: UseBaseQueryOptions<Tanstack.UseSuspenseQueryOptions<TData[], TError>> & {
    query: string | CompilableQuery<TData>;
  },
  queryClient?: Tanstack.QueryClient
): Tanstack.UseSuspenseQueryResult<TData[], TError>;

export function useSuspenseQuery<TData = unknown, TError = Tanstack.DefaultError>(
  options: UseBaseQueryOptions<Tanstack.UseSuspenseQueryOptions<TData, TError>>,
  queryClient: Tanstack.QueryClient = Tanstack.useQueryClient()
) {
  return useQueryCore(options, queryClient, Tanstack.useSuspenseQuery);
}

function useQueryCore<
  TData,
  TError,
  TQueryOptions extends Tanstack.UseQueryOptions<TData, TError> | Tanstack.UseSuspenseQueryOptions<TData, TError>,
  TQueryResult extends Tanstack.UseQueryResult<TData, TError> | Tanstack.UseSuspenseQueryResult<TData, TError>
>(
  options: UseBaseQueryOptions<TQueryOptions>,
  queryClient: Tanstack.QueryClient,
  useQueryFn: (options: TQueryOptions, queryClient?: Tanstack.QueryClient) => TQueryResult
): TQueryResult {
  const powerSync = usePowerSync();

  if (!powerSync) {
    throw new Error('PowerSync is not available');
  }

  const [error, setError] = React.useState<Error | null>(null);
  const [tables, setTables] = React.useState<string[]>([]);
  const { query, parameters, ...resolvedOptions } = options;

  React.useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [powerSync, query, parameters, options.queryKey]);

  let sqlStatement = '';
  let queryParameters = [];

  if (query) {
    try {
      const parsedQuery = parseQuery(query, parameters);

      sqlStatement = parsedQuery.sqlStatement;
      queryParameters = parsedQuery.parameters;
    } catch (e) {
      setError(e);
    }
  }

  const stringifiedParams = JSON.stringify(queryParameters);
  const stringifiedKey = JSON.stringify(options.queryKey);

  const fetchTables = async () => {
    try {
      const tables = await powerSync.resolveTables(sqlStatement, queryParameters);
      setTables(tables);
    } catch (e) {
      setError(e);
    }
  };

  React.useEffect(() => {
    if (!query) return;

    (async () => {
      await fetchTables();
    })();
  }, [powerSync, sqlStatement, stringifiedParams]);

  const queryFn = React.useCallback(async () => {
    if (error) {
      return Promise.reject(error);
    }

    try {
      return typeof query == 'string' ? powerSync.getAll<TData>(sqlStatement, queryParameters) : query.execute();
    } catch (e) {
      return Promise.reject(e);
    }
  }, [powerSync, query, parameters, stringifiedKey, error]);

  React.useEffect(() => {
    if (error || !query) return () => {};

    const abort = new AbortController();
    powerSync.onChangeWithCallback(
      {
        onChange: () => {
          queryClient.invalidateQueries({
            queryKey: options.queryKey
          });
        },
        onError: (e) => {
          setError(e);
        }
      },
      {
        tables,
        signal: abort.signal
      }
    );
    return () => abort.abort();
  }, [powerSync, queryClient, stringifiedKey, tables, error]);

  return useQueryFn(
    {
      ...(resolvedOptions as TQueryOptions),
      queryFn: query ? queryFn : resolvedOptions.queryFn
    } as TQueryOptions,
    queryClient
  );
}