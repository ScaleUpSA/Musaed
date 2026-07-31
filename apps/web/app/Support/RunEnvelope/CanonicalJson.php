<?php

namespace App\Support\RunEnvelope;

use InvalidArgumentException;

final class CanonicalJson
{
    public static function encode(mixed $value): string
    {
        if (is_array($value)) {
            if (array_is_list($value)) {
                return '['.implode(',', array_map(self::encode(...), $value)).']';
            }

            $keys = array_keys($value);
            usort(
                $keys,
                static fn (string|int $left, string|int $right): int => strcmp((string) $left, (string) $right),
            );

            $entries = [];
            foreach ($keys as $key) {
                $key = (string) $key;
                $entries[] = self::encode($key).':'.self::encode($value[$key]);
            }

            return '{'.implode(',', $entries).'}';
        }

        if (is_int($value) || is_float($value)) {
            if (is_float($value) && ! is_finite($value)) {
                throw new InvalidArgumentException('Canonical JSON cannot contain non-finite numbers.');
            }

            if (is_float($value)) {
                if (floor($value) !== $value) {
                    throw new InvalidArgumentException('Canonical JSON can contain only integer numbers.');
                }

                $value = (int) $value;
            }

            return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        }

        if (is_string($value) || is_bool($value) || $value === null) {
            return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        }

        throw new InvalidArgumentException('Canonical JSON cannot contain this value.');
    }
}
