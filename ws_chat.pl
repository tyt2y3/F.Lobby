#!/usr/bin/env perl
use utf8;
use Mojolicious::Lite;
use DateTime;

my $clients = {};

websocket '/echo' => sub {
	my $self = shift;

	app->log->debug(sprintf 'Client connected: %s', $self->tx);
	my $id = sprintf "%s", $self->tx;
	$clients->{$id} = $self->tx;

	$self->on(message => sub {
		my ($self, $msg) = @_;

		my $dt   = DateTime->now( time_zone => 'Asia/Tokyo');

		for (keys %$clients) {
			$clients->{$_}->send({json => {
				hms  => $dt->hms,
				text => $msg,
			}});
		}
	});

	$self->on(finish => sub {
		app->log->debug('Client disconnected');
		delete $clients->{$id};
	});
};

app->start;