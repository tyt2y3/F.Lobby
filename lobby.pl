#!/usr/bin/env perl
use utf8;
use Mojolicious::Lite;

my $names = {};
my $peers = {};

post '/protocol' => sub {
	my $self = shift;
	$self->render(data => '{"name":"F.Lobby","protocol":"F.Lobby 001"}');
};

post '/login' => sub {
	my $self = shift;
	my $name = $self->req->body;
	if( !exists $names->{$name} ) {
		$names->{$name} = 1;
		$self->render(data => 'success');
	}
	else {
		$self->render(data => 'fail');
	}
};

websocket '/chat' => sub {
	my $self = shift;

	app->log->debug(sprintf 'Client connected: %s', $self->tx);
	Mojo::IOLoop->stream($self->tx->connection)->timeout(5*60*1000); #5 minutes
	my $name;

	$self->on(json => sub {
		my ($client, $data) = @_;
		if( exists $data->{mess} && $data->{mess} eq 'logged in.') {
			$name = $data->{name};
			$names->{$data->{name}} = $self->tx;
		}
		if( $data->{target} eq 'all') {
			for (keys %$names) {
				$names->{$_}->send({json => $data});
			}
		} else {
			$names->{$data->{target}}->send({json => $data});
		}
	});

	$self->on(finish => sub {
		app->log->debug('Client disconnected');
		if( $name) {
			delete $names->{$name};
		}
	});
};

websocket '/peer' => sub {
	my $self = shift;
	my $name;

	app->log->debug(sprintf 'Peer connected: %s', $self->tx);
	Mojo::IOLoop->stream($self->tx->connection)->timeout(1*60*1000); #1 minute

	$self->on(json => sub {
		my ($client, $data) = @_;
		if( exists $data->{open}) {
			if( ! exists $peers->{$data->{name}}) {
				$name = $data->{name};
				$peers->{$data->{name}} = $self->tx;
			}
		}
		if( exists $data->{target} && exists $peers->{$data->{target}}) {
			$peers->{$data->{target}}->send({json => $data});
		}
	});

	$self->on(finish => sub {
		app->log->debug('Peer disconnected');
		delete $peers->{$name};
	});
};

app->start;
