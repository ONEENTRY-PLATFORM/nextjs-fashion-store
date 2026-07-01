import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './index';

/** Typed version of useDispatch — use instead of plain useDispatch */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

/** Typed version of useSelector — use instead of plain useSelector */
export const useAppSelector = useSelector.withTypes<RootState>();
