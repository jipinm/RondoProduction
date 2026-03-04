<?php

declare(strict_types=1);

namespace XS2EventProxy\Service;

use PDOStatement;
use PDO;

/**
 * TypeCastingPDOStatement
 *
 * Custom PDOStatement registered via PDO::ATTR_STATEMENT_CLASS.
 * Casts column values to native PHP types on fetch.
 * Required for LiteSpeed PHP with libmariadb which always returns strings
 * regardless of PDO::ATTR_STRINGIFY_FETCHES setting.
 */
class TypeCastingPDOStatement extends PDOStatement
{
    protected function __construct() {}

    public function fetch(
        int $mode = PDO::FETCH_DEFAULT,
        int $cursorOrientation = PDO::FETCH_ORI_NEXT,
        int $cursorOffset = 0
    ): mixed {
        $row = parent::fetch(PDO::FETCH_ASSOC);
        return is_array($row) ? $this->castRow($row) : $row;
    }

    public function fetchAll(int $mode = PDO::FETCH_DEFAULT, mixed ...$args): array
    {
        $rows = parent::fetchAll(PDO::FETCH_ASSOC);
        return array_map([$this, 'castRow'], $rows);
    }

    private function castRow(array $row): array
    {
        $count = $this->columnCount();
        for ($i = 0; $i < $count; $i++) {
            $meta = $this->getColumnMeta($i);
            if ($meta === false) continue;
            $name = $meta['name'];
            if (!array_key_exists($name, $row) || $row[$name] === null) continue;
            $type = strtolower($meta['native_type'] ?? '');
            $row[$name] = match (true) {
                in_array($type, ['long', 'longlong', 'short', 'tiny', 'int24', 'year']) => (int)   $row[$name],
                in_array($type, ['double', 'float', 'decimal', 'newdecimal'])           => (float) $row[$name],
                default => $row[$name],
            };
        }
        return $row;
    }
}
