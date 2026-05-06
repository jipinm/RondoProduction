<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;

class ExchangeRateController
{
    private const FRANKFURTER_URL = 'https://api.frankfurter.app/latest';
    private const ALLOWED_CURRENCIES = [
        'AED','AFN','ALL','AMD','ANG','AOA','ARS','AUD','AWG','AZN','BAM','BBD','BDT','BGN','BHD',
        'BIF','BMD','BND','BOB','BRL','BSD','BTN','BWP','BYN','BZD','CAD','CDF','CHF','CLP','CNY',
        'COP','CRC','CUP','CVE','CZK','DJF','DKK','DOP','DZD','EGP','ERN','ETB','EUR','FJD','FKP',
        'GBP','GEL','GHS','GIP','GMD','GNF','GTQ','GYD','HKD','HNL','HRK','HTG','HUF','IDR','ILS',
        'INR','IQD','IRR','ISK','JMD','JOD','JPY','KES','KGS','KHR','KMF','KPW','KRW','KWD','KYD',
        'KZT','LAK','LBP','LKR','LRD','LSL','LYD','MAD','MDL','MGA','MKD','MMK','MNT','MOP','MRU',
        'MUR','MVR','MWK','MXN','MYR','MZN','NAD','NGN','NIO','NOK','NPR','NZD','OMR','PAB','PEN',
        'PGK','PHP','PKR','PLN','PYG','QAR','RON','RSD','RUB','RWF','SAR','SBD','SCR','SDG','SEK',
        'SGD','SHP','SLL','SOS','SRD','STN','SVC','SYP','SZL','THB','TJS','TMT','TND','TOP','TRY',
        'TTD','TWD','TZS','UAH','UGX','USD','UYU','UZS','VES','VND','VUV','WST','XAF','XCD','XOF',
        'XPF','YER','ZAR','ZMW','ZWL',
    ];

    public function __construct(
        private Client $httpClient,
        private LoggerInterface $logger
    ) {}

    public function getRates(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $from = strtoupper(trim($params['from'] ?? ''));
        $to   = strtoupper(trim($params['to']   ?? ''));

        if (!$from || !$to) {
            return $this->jsonError($response, 'Missing required parameters: from, to', 400);
        }

        if (!in_array($from, self::ALLOWED_CURRENCIES, true) || !in_array($to, self::ALLOWED_CURRENCIES, true)) {
            return $this->jsonError($response, 'Invalid currency code', 400);
        }

        if ($from === $to) {
            $payload = json_encode(['amount' => 1, 'base' => $from, 'date' => date('Y-m-d'), 'rates' => [$to => 1.0]]);
            $response->getBody()->write($payload);
            return $response->withHeader('Content-Type', 'application/json');
        }

        try {
            $apiResponse = $this->httpClient->get(self::FRANKFURTER_URL, [
                'query' => ['from' => $from, 'to' => $to],
                'timeout' => 10,
            ]);

            $body = (string) $apiResponse->getBody();
            $response->getBody()->write($body);
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withHeader('Cache-Control', 'public, max-age=300');

        } catch (GuzzleException $e) {
            $this->logger->error('Exchange rate fetch failed', ['from' => $from, 'to' => $to, 'error' => $e->getMessage()]);
            return $this->jsonError($response, 'Failed to fetch exchange rates', 502);
        }
    }

    private function jsonError(Response $response, string $message, int $status): Response
    {
        $response->getBody()->write(json_encode(['error' => $message]));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }
}
